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
    // 1. Fetch Summary Totals concurrently
    const [
      totalItemsCount,
      activeProjectsCount,
      buyListCount,
      allItems
    ] = await Promise.all([
      InventoryItem.countDocuments({}),
      Project.countDocuments({ status: 'active' }),
      BuyListItem.countDocuments({ status: 'pending' }),
      InventoryItem.find({}).lean() // Need full items for multiple calculations
    ]);

    // 2. Compute Stock Status and Categories from allItems
    let totalQuantity = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    const lowStockItems = [];
    const outOfStockItems = [];
    const categoryMap = new Map();

    allItems.forEach(item => {
      const q = Number(item.quantity) || 0;
      const threshold = Number(item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5);
      
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

    const categorySummary = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    // 3. Most Used Items (All time or last 90 days)
    const ninetyDaysAgo = getDaysAgoDate(90);
    const mostUsedAgg = await InventoryUsage.aggregate([
      { $match: { createdAt: { $gte: ninetyDaysAgo } } },
      { $group: { _id: '$item', totalUsed: { $sum: '$quantity' } } },
      { $sort: { totalUsed: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'inventoryitems', localField: '_id', foreignField: '_id', as: 'itemDoc' } },
      { $unwind: { path: '$itemDoc', preserveNullAndEmptyArrays: true } }
    ]);

    const mostUsedItems = mostUsedAgg.map(agg => ({
      _id: agg._id,
      name: agg.itemDoc?.name || 'Unknown Item',
      totalUsed: agg.totalUsed,
      category: agg.itemDoc?.category
    }));

    // 4. Project Summary (Active Projects with usage)
    const activeProjects = await Project.find({ status: 'active' }).limit(5).lean();
    const projectSummary = await Promise.all(activeProjects.map(async (p) => {
      const usages = await InventoryUsage.find({ project: p._id }).lean();
      const uniqueItems = new Set(usages.map(u => u.item.toString())).size;
      const totalUnits = usages.reduce((sum, u) => sum + (Number(u.quantity) || 0), 0);
      return {
        _id: p._id,
        name: p.name,
        uniqueItems,
        totalUnits
      };
    }));

    // 5. Recent Activity (Last 10 events combined)
    // We will fetch the latest 10 from each collection and merge/sort in memory
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
    // We will estimate utilization based on item presence in physical boxes
    let sectionA_Items = 0;
    let sectionB_Items = 0;
    
    // Quick heuristic: items that have location codes starting with A vs B
    allItems.forEach(item => {
      if (item.locations && item.locations.length > 0) {
        // Just checking the first mapped location for simplicity
        const mainLoc = item.locations[0];
        // Note: The fully resolved logic might require traversing the tree, but for performance
        // we can check if there's a cached string or just rely on the fact that Phase 20 hierarchical
        // path often results in display IDs or node references.
        // Actually, we should fetch StorageNodes and map them.
      }
    });
    
    // Better way: fetch all StorageNodes to map them
    const allNodes = await StorageNode.find({}).lean();
    const nodeMap = new Map(allNodes.map(n => [n._id.toString(), n]));
    
    const resolveRootSection = (nodeId) => {
      let current = nodeMap.get(nodeId?.toString());
      let section = 'A'; // default
      while (current) {
        if (current.section) section = current.section;
        if (!current.parent) break;
        current = nodeMap.get(current.parent.toString());
      }
      return section;
    };

    allItems.forEach(item => {
      if (item.locations && item.locations.length > 0) {
        const section = resolveRootSection(item.locations[0].node);
        if (section === 'A') sectionA_Items++;
        if (section === 'B') sectionB_Items++;
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
        lowStockItems: lowStockItems.map(item => ({ _id: item._id, name: item.name, quantity: item.quantity, minStock: item.lowStockThreshold || 5, category: item.category })).slice(0, 10),
        outOfStockItems: outOfStockItems.map(item => ({ _id: item._id, name: item.name, category: item.category })).slice(0, 10),
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
