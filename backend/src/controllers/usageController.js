const InventoryUsage = require('../models/InventoryUsage');
const InventoryStockIn = require('../models/InventoryStockIn');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const InventoryItem = require('../models/InventoryItem');
const Project = require('../models/Project');
const { deepPopulateLocation } = require('../utils/locationUtils');
const notificationService = require('../services/notificationService');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Record inventory item withdrawal / usage linked to a Project
// @route   POST /api/usage
// @access  Private (requireAuth)
exports.createUsage = async (req, res) => {
  try {
    const { itemId, locationId, projectId, quantity, notes } = req.body;

    // 1. Validate Item ID format
    if (!itemId || !isValidId(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid item ID is required'
      });
    }

    // 2. Validate Project ID format
    if (!projectId || !isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid project selection is required'
      });
    }

    if (!locationId || !isValidId(locationId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid physical location selection is required'
      });
    }

    // 3. Validate Quantity
    const qty = Number(quantity);
    if (isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity to take must be a positive integer (at least 1)'
      });
    }

    // Validate Notes length if provided
    const noteText = String(notes || '').trim();
    if (noteText.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Notes cannot exceed 500 characters'
      });
    }

    // 4. Verify Project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Selected project not found'
      });
    }

    // 5. Attempt MongoDB session transaction for atomic stock reduction
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    try {
      const item = await InventoryItem.findOneAndUpdate(
        { 
          _id: itemId, 
          'locations': { $elemMatch: { node: locationId, quantity: { $gte: qty } } } 
        },
        { $inc: { quantity: -qty, 'locations.$.quantity': -qty } },
        { new: true, session: session || undefined }
      ).populate(deepPopulateLocation);

      if (!item) {
        const checkItem = await InventoryItem.findById(itemId).session(session || undefined);
        if (session) await session.abortTransaction();
        if (!checkItem) {
          return res.status(404).json({
            success: false,
            message: 'Inventory item not found'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory. Only ${checkItem.quantity} units are available.`
        });
      }

      const usage = new InventoryUsage({
        item: item._id,
        project: project._id,
        quantity: qty,
        locationNode: locationId,
        notes: noteText
      });

      await usage.save(session ? { session } : undefined);

      if (session) await session.commitTransaction();

      // Trigger Notifications in background
      notificationService.checkItemThresholds(item, req.user);
      notificationService.generateMovementAlert('OUT', qty, item, req.user, project, null);

      // Check Project Shortage if needed (Project has items, we just used some)
      // For phase 23, project shortage is if required > available. We can add a function `checkProjectShortages` if project had required amounts, but currently Project Model doesn't explicitly have required quantities per item, only total required. If it does, we check it.

      return res.status(201).json({
        success: true,
        message: `${qty} ${item.name} unit(s) taken for ${project.name}.`,
        data: {
          usage,
          item,
          project
        }
      });
    } catch (dbErr) {
      if (session) await session.abortTransaction();
      throw dbErr;
    } finally {
      if (session) session.endSession();
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    console.error('Create Usage Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to complete the withdrawal. Please try again.'
    });
  }
};

// @desc    Get all inventory activity records (stock-in + stock-out) with filtering & pagination
// @route   GET /api/usage
// @access  Public
exports.getAllUsage = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      itemId = '',
      projectId = '',
      dateRange = 'all',
      activityType = 'all' // 'all', 'stock_in', 'usage', 'adjustment'
    } = req.query;

    const baseQuery = {};

    if (itemId && isValidId(itemId)) {
      baseQuery.item = itemId;
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === '30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (startDate) {
        baseQuery.createdAt = { $gte: startDate };
      }
    }

    const trimmedSearch = String(search).trim();
    let matchingItemIds = null;
    let matchingProjectIds = null;

    if (trimmedSearch) {
      const searchRegex = new RegExp(trimmedSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

      const matchingItems = await InventoryItem.find({ name: searchRegex }).select('_id');
      matchingItemIds = matchingItems.map(i => i._id);

      const matchingProjects = await Project.find({ name: searchRegex }).select('_id');
      matchingProjectIds = matchingProjects.map(p => p._id);
    }

    let usagesList = [];
    let stockInsList = [];
    let adjustmentsList = [];

    // Fetch InventoryUsage records if activityType is 'all' or 'usage'
    if (activityType === 'all' || activityType === 'usage') {
      const usageQuery = { ...baseQuery };
      if (projectId && isValidId(projectId)) {
        usageQuery.project = projectId;
      }

      if (trimmedSearch) {
        const searchRegex = new RegExp(trimmedSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        usageQuery.$or = [
          { location: searchRegex },
          { notes: searchRegex },
          { item: { $in: matchingItemIds } },
          { project: { $in: matchingProjectIds } }
        ];
      }

      const usages = await InventoryUsage.find(usageQuery)
        .populate('item', 'name image location quantity')
        .populate('project', 'name status')
        .sort({ createdAt: -1 });

      usagesList = usages.map(u => ({
        _id: u._id,
        type: 'usage',
        item: u.item,
        project: u.project,
        quantity: u.quantity,
        location: u.location,
        notes: u.notes,
        createdAt: u.createdAt
      }));
    }

    // Fetch InventoryStockIn records if activityType is 'all' or 'stock_in' (Stock In records do not have projects)
    if ((activityType === 'all' || activityType === 'stock_in') && (!projectId || !isValidId(projectId))) {
      const stockInQuery = { ...baseQuery };

      if (trimmedSearch) {
        const searchRegex = new RegExp(trimmedSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        stockInQuery.$or = [
          { reason: searchRegex },
          { notes: searchRegex },
          { item: { $in: matchingItemIds } }
        ];
      }

      const stockIns = await InventoryStockIn.find(stockInQuery)
        .populate('item', 'name image location quantity')
        .sort({ createdAt: -1 });

      stockInsList = stockIns.map(s => ({
        _id: s._id,
        type: 'stock_in',
        item: s.item,
        quantity: s.quantity,
        reason: s.reason,
        notes: s.notes,
        createdAt: s.createdAt
      }));
    }

    // Fetch InventoryAdjustment records if activityType is 'all' or 'adjustment'
    if ((activityType === 'all' || activityType === 'adjustment') && (!projectId || !isValidId(projectId))) {
      const adjustQuery = { ...baseQuery };

      if (trimmedSearch) {
        const searchRegex = new RegExp(trimmedSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        adjustQuery.$or = [
          { reason: searchRegex },
          { notes: searchRegex },
          { item: { $in: matchingItemIds } }
        ];
      }

      const adjustments = await InventoryAdjustment.find(adjustQuery)
        .populate('item', 'name image location quantity')
        .sort({ createdAt: -1 });

      adjustmentsList = adjustments.map(a => ({
        _id: a._id,
        type: 'adjustment',
        item: a.item,
        quantity: a.difference, // store difference as quantity
        previousQuantity: a.previousQuantity,
        newQuantity: a.newQuantity,
        reason: a.reason,
        notes: a.notes,
        createdAt: a.createdAt
      }));
    }

    // Combine & Sort by createdAt DESC
    const combined = [...usagesList, ...stockInsList, ...adjustmentsList];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = combined.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum) || 1;

    const paginatedData = combined.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      count: paginatedData.length,
      total,
      page: pageNum,
      totalPages,
      data: paginatedData
    });
  } catch (error) {
    console.error('Get All Usage / Activity Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve activity records.'
    });
  }
};

// @desc    Get activity records and item summary for a specific inventory item
// @route   GET /api/usage/item/:itemId
// @access  Public
exports.getItemUsage = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!isValidId(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID format'
      });
    }

    const item = await InventoryItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const [usages, stockIns, adjustments] = await Promise.all([
      InventoryUsage.find({ item: itemId })
        .populate('item', 'name image location quantity')
        .populate('project', 'name status')
        .sort({ createdAt: -1 }),
      InventoryStockIn.find({ item: itemId })
        .populate('item', 'name image location quantity')
        .sort({ createdAt: -1 }),
      InventoryAdjustment.find({ item: itemId })
        .populate('item', 'name image location quantity')
        .sort({ createdAt: -1 })
    ]);

    let totalUnitsUsed = 0;
    const uniqueProjects = new Set();
    const usageRecords = usages.map(u => {
      totalUnitsUsed += Number(u.quantity) || 0;
      if (u.project) {
        uniqueProjects.add(u.project._id ? String(u.project._id) : String(u.project));
      }
      return {
        _id: u._id,
        type: 'usage',
        item: u.item,
        project: u.project,
        quantity: u.quantity,
        location: u.location,
        notes: u.notes,
        createdAt: u.createdAt
      };
    });

    let totalUnitsAdded = 0;
    const stockInRecords = stockIns.map(s => {
      totalUnitsAdded += Number(s.quantity) || 0;
      return {
        _id: s._id,
        type: 'stock_in',
        item: s.item,
        quantity: s.quantity,
        reason: s.reason,
        notes: s.notes,
        createdAt: s.createdAt
      };
    });

    let totalAdjusted = 0;
    const adjustmentRecords = adjustments.map(a => {
      totalAdjusted += Number(a.difference) || 0;
      return {
        _id: a._id,
        type: 'adjustment',
        item: a.item,
        quantity: a.difference,
        previousQuantity: a.previousQuantity,
        newQuantity: a.newQuantity,
        reason: a.reason,
        notes: a.notes,
        createdAt: a.createdAt
      };
    });

    const combinedActivity = [...usageRecords, ...stockInRecords, ...adjustmentRecords];
    combinedActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      summary: {
        currentStock: item.quantity,
        totalAdded: totalUnitsAdded,
        totalUnitsUsed,
        totalAdjusted,
        projectsCount: uniqueProjects.size
      },
      data: combinedActivity
    });
  } catch (error) {
    console.error('Get Item Usage Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve item activity records.'
    });
  }
};
