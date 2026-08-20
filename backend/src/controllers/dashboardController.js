const InventoryItem = require('../models/InventoryItem');
const InventoryUsage = require('../models/InventoryUsage');
const InventoryStockIn = require('../models/InventoryStockIn');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const Project = require('../models/Project');
const BuyListItem = require('../models/BuyListItem');
const StorageNode = require('../models/StorageNode');

// Helper to determine the start of the day N days ago
const getDaysAgoDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
};

// @desc    Get comprehensive dashboard summary
// @route   GET /api/dashboard/summary
// @access  Private
exports.getDashboardSummary = async (req, res) => {
  try {
    const baseItemQuery = { isArchived: { $ne: true } };

    // 1. Fetch Summary Totals & lightweight projected item data concurrently
    const [
      totalItemsCount,
      activeProjectsCount,
      buyListCount,
      allItems
    ] = await Promise.all([
      InventoryItem.countDocuments(baseItemQuery),
      Project.countDocuments({ status: 'active' }),
      BuyListItem.countDocuments({ status: 'NEEDED' }),
      InventoryItem.find(baseItemQuery)
        .select('_id name quantity minimumStock lowStockThreshold category locations.node')
        .lean()
    ]);

    // 2. Compute Stock Status and Categories in-memory from lightweight projection
    let totalQuantity = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    const lowStockItems = [];
    const outOfStockItems = [];
    const categoryMap = new Map();

    allItems.forEach(item => {
      const q = Number(item.quantity) || 0;
      const threshold = Number(item.minimumStock > 0 ? item.minimumStock : (item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5));
      
      totalQuantity += q;

      if (q === 0) {
        outOfStockCount++;
        outOfStockItems.push(item);
      } else if (q <= threshold) {
        lowStockCount++;
        lowStockItems.push(item);
      }

      const cat = item.category || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const categorySummary = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Most Used Items (Last 90 days)
    const ninetyDaysAgo = getDaysAgoDate(90);
    const mostUsedAgg = await InventoryUsage.aggregate([
      { $match: { createdAt: { $gte: ninetyDaysAgo } } },
      { $group: { _id: '$item', totalUsed: { $sum: '$quantity' } } },
      { $sort: { totalUsed: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'inventoryitems', localField: '_id', foreignField: '_id', as: 'itemDoc' } },
      { $unwind: { path: '$itemDoc', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, totalUsed: 1, name: '$itemDoc.name', category: '$itemDoc.category' } }
    ]);

    const mostUsedItems = mostUsedAgg.map(agg => ({
      _id: agg._id,
      name: agg.name || 'Unknown Item',
      totalUsed: agg.totalUsed,
      category: agg.category
    }));

    // 4. Project Summary (Active Projects with aggregated usage)
    const activeProjects = await Project.find({ status: 'active' }).select('_id name').limit(5).lean();
    const activeProjectIds = activeProjects.map(p => p._id);

    const projectUsages = await InventoryUsage.aggregate([
      { $match: { project: { $in: activeProjectIds } } },
      {
        $group: {
          _id: '$project',
          uniqueItemsSet: { $addToSet: '$item' },
          totalUnits: { $sum: '$quantity' }
        }
      }
    ]);

    const projectUsageMap = new Map();
    projectUsages.forEach(pu => {
      projectUsageMap.set(String(pu._id), {
        uniqueItems: (pu.uniqueItemsSet || []).length,
        totalUnits: pu.totalUnits || 0
      });
    });

    const projectSummary = activeProjects.map(p => {
      const stats = projectUsageMap.get(String(p._id)) || { uniqueItems: 0, totalUnits: 0 };
      return {
        _id: p._id,
        name: p.name,
        uniqueItems: stats.uniqueItems,
        totalUnits: stats.totalUnits
      };
    });

    // 5. Recent Activity (Last 10 events combined)
    const [latestStockIns, latestUsages, latestAdjustments] = await Promise.all([
      InventoryStockIn.find({}).sort({ createdAt: -1 }).limit(10).populate('item', 'name').lean(),
      InventoryUsage.find({}).sort({ createdAt: -1 }).limit(10).populate('item', 'name').populate('project', 'name').lean(),
      InventoryAdjustment.find({}).sort({ createdAt: -1 }).limit(10).populate('item', 'name').lean()
    ]);

    let recentActivity = [
      ...latestStockIns.map(doc => ({ type: 'stock_in', date: doc.createdAt, quantity: doc.quantity, itemName: doc.item?.name, location: doc.location?.code, user: doc.user })),
      ...latestUsages.map(doc => ({ type: 'stock_out', date: doc.createdAt, quantity: doc.quantity, itemName: doc.item?.name, projectName: doc.project?.name, user: doc.user })),
      ...latestAdjustments.map(doc => ({ type: 'adjustment', date: doc.createdAt, quantity: doc.quantityDifference, itemName: doc.item?.name, reason: doc.reason, user: doc.user }))
    ];
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    recentActivity = recentActivity.slice(0, 10);

    // 6. Storage Utilization (Section A vs Section B)
    const allNodes = await StorageNode.find({}).select('_id section parentId').lean();
    const nodeMap = new Map(allNodes.map(n => [String(n._id), n]));

    const resolveRootSection = (nodeId) => {
      let current = nodeMap.get(String(nodeId));
      let section = 'A';
      while (current) {
        if (current.section) section = current.section;
        if (!current.parentId) break;
        current = nodeMap.get(String(current.parentId));
      }
      return section;
    };

    let sectionA_Items = 0;
    let sectionB_Items = 0;

    allItems.forEach(item => {
      if (item.locations && item.locations.length > 0) {
        const sec = resolveRootSection(item.locations[0].node);
        if (sec === 'A') sectionA_Items++;
        if (sec === 'B') sectionB_Items++;
      }
    });

    const storageUtilization = {
      sectionA: { itemTypes: sectionA_Items },
      sectionB: { itemTypes: sectionB_Items }
    };

    // Return aggregated payload
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalItems: totalItemsCount,
          totalQuantity,
          activeProjects: activeProjectsCount,
          buyListItems: buyListCount
        },
        stockStatus: {
          inStock: totalItemsCount - lowStockCount - outOfStockCount,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount
        },
        lowStockItems: lowStockItems.map(item => ({
          _id: item._id,
          name: item.name,
          quantity: item.quantity,
          minStock: item.minimumStock || item.lowStockThreshold || 5,
          category: item.category
        })).slice(0, 10),
        outOfStockItems: outOfStockItems.map(item => ({
          _id: item._id,
          name: item.name,
          category: item.category
        })).slice(0, 10),
        mostUsedItems,
        recentActivity,
        projectSummary,
        categorySummary,
        storageUtilization
      }
    });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary data.' });
  }
};
