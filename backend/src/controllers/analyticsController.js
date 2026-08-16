const InventoryItem = require('../models/InventoryItem');
const InventoryUsage = require('../models/InventoryUsage');
const InventoryStockIn = require('../models/InventoryStockIn');
const Project = require('../models/Project');

// Helper date range filter
const getDateStartDate = (dateRange) => {
  if (!dateRange || dateRange === 'all') return null;

  const now = new Date();
  if (dateRange === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (dateRange === '7days') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (dateRange === '30days') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (dateRange === '90days') {
    return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
  return null;
};

// @desc    Get summary statistics for current inventory & stock movement
// @route   GET /api/analytics/summary
// @access  Public (Read-Only)
exports.getSummary = async (req, res) => {
  try {
    const { dateRange = 'all' } = req.query;

    // 1. Current Inventory Metrics (Always current regardless of date range)
    const allItems = await InventoryItem.find({});
    const totalItems = allItems.length;

    let totalUnits = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    allItems.forEach((item) => {
      const q = Number(item.quantity) || 0;
      const threshold = Number(item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5);

      totalUnits += q;

      if (q === 0) {
        outOfStockItems += 1;
      } else if (q <= threshold) {
        lowStockItems += 1;
      }
    });

    // 2. Movement Metrics based on dateRange
    const startDate = getDateStartDate(dateRange);
    const dateMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    const [stockInAgg, stockOutAgg] = await Promise.all([
      InventoryStockIn.aggregate([
        { $match: dateMatch },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]),
      InventoryUsage.aggregate([
        { $match: dateMatch },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ])
    ]);

    const stockIn = stockInAgg[0]?.total || 0;
    const stockOut = stockOutAgg[0]?.total || 0;
    const netChange = stockIn - stockOut;

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        totalUnits,
        lowStockItems,
        outOfStockItems,
        stockIn,
        stockOut,
        netChange
      }
    });
  } catch (error) {
    console.error('Analytics Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to calculate inventory summary.'
    });
  }
};

// @desc    Get most-used inventory items by total quantity withdrawn
// @route   GET /api/analytics/most-used-items
// @access  Public (Read-Only)
exports.getMostUsedItems = async (req, res) => {
  try {
    const { dateRange = 'all', limit = 5 } = req.query;
    const limitNum = Math.max(1, parseInt(limit, 10) || 5);
    const startDate = getDateStartDate(dateRange);
    const dateMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    const results = await InventoryUsage.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$item',
          totalQuantityUsed: { $sum: '$quantity' },
          withdrawalCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantityUsed: -1 } },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'inventoryitems',
          localField: '_id',
          foreignField: '_id',
          as: 'itemDetails'
        }
      },
      { $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true } }
    ]);

    const formattedData = results.map((row) => ({
      itemId: row._id,
      name: row.itemDetails?.name || 'Deleted / Unknown Item',
      location: row.itemDetails?.location?.code || 'N/A',
      currentStock: row.itemDetails?.quantity ?? 0,
      totalQuantityUsed: row.totalQuantityUsed,
      withdrawalCount: row.withdrawalCount
    }));

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Most Used Items Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve most-used inventory items.'
    });
  }
};

// @desc    Get top project consumption by total units used
// @route   GET /api/analytics/most-used-projects
// @access  Public (Read-Only)
exports.getMostUsedProjects = async (req, res) => {
  try {
    const { dateRange = 'all', limit = 5 } = req.query;
    const limitNum = Math.max(1, parseInt(limit, 10) || 5);
    const startDate = getDateStartDate(dateRange);
    const dateMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    const results = await InventoryUsage.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$project',
          totalUnitsConsumed: { $sum: '$quantity' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { totalUnitsConsumed: -1 } },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'projectDetails'
        }
      },
      { $unwind: { path: '$projectDetails', preserveNullAndEmptyArrays: true } }
    ]);

    const formattedData = results.map((row) => ({
      projectId: row._id,
      name: row.projectDetails?.name || 'Deleted / Unassigned Project',
      status: row.projectDetails?.status || 'active',
      totalUnitsConsumed: row.totalUnitsConsumed,
      transactionCount: row.transactionCount
    }));

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Most Used Projects Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve project consumption analytics.'
    });
  }
};

// @desc    Get lists of low-stock and out-of-stock items
// @route   GET /api/analytics/low-stock
// @access  Public (Read-Only)
exports.getLowStockItems = async (req, res) => {
  try {
    const allItems = await InventoryItem.find({}).sort({ quantity: 1, name: 1 });

    const lowStock = [];
    const outOfStock = [];

    allItems.forEach((item) => {
      const q = Number(item.quantity) || 0;
      const threshold = Number(item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5);

      if (q === 0) {
        outOfStock.push({
          _id: item._id,
          name: item.name,
          quantity: item.quantity,
          lowStockThreshold: threshold,
          location: item.location
        });
      } else if (q <= threshold) {
        lowStock.push({
          _id: item._id,
          name: item.name,
          quantity: item.quantity,
          lowStockThreshold: threshold,
          location: item.location
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        lowStock,
        outOfStock
      }
    });
  } catch (error) {
    console.error('Low Stock Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve low-stock items.'
    });
  }
};

// @desc    Get stock movement timeline data for charting
// @route   GET /api/analytics/movement
// @access  Public (Read-Only)
exports.getMovementTimeline = async (req, res) => {
  try {
    const { dateRange = 'all' } = req.query;
    const startDate = getDateStartDate(dateRange);
    const dateMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    const [stockIns, usages] = await Promise.all([
      InventoryStockIn.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalStockIn: { $sum: '$quantity' }
          }
        }
      ]),
      InventoryUsage.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalStockOut: { $sum: '$quantity' }
          }
        }
      ])
    ]);

    const timelineMap = new Map();

    stockIns.forEach((row) => {
      const dateKey = row._id;
      timelineMap.set(dateKey, {
        date: dateKey,
        stockIn: row.totalStockIn,
        stockOut: 0
      });
    });

    usages.forEach((row) => {
      const dateKey = row._id;
      if (timelineMap.has(dateKey)) {
        timelineMap.get(dateKey).stockOut = row.totalStockOut;
      } else {
        timelineMap.set(dateKey, {
          date: dateKey,
          stockIn: 0,
          stockOut: row.totalStockOut
        });
      }
    });

    const timeline = Array.from(timelineMap.values());
    timeline.sort((a, b) => a.date.localeCompare(b.date));

    // Compute netChange for each date point
    const resultTimeline = timeline.map((pt) => ({
      ...pt,
      netChange: pt.stockIn - pt.stockOut
    }));

    res.status(200).json({
      success: true,
      data: resultTimeline
    });
  } catch (error) {
    console.error('Movement Timeline Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve movement timeline.'
    });
  }
};
