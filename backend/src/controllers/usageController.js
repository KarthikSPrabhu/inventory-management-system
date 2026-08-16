const InventoryUsage = require('../models/InventoryUsage');
const InventoryItem = require('../models/InventoryItem');
const Project = require('../models/Project');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Record inventory item withdrawal / usage linked to a Project
// @route   POST /api/usage
// @access  Public
exports.createUsage = async (req, res) => {
  try {
    const { itemId, projectId, quantity, notes } = req.body;

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

    // 5. Fetch current item from database (verifying real-time stock)
    const item = await InventoryItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // 6. Verify sufficient quantity in MongoDB Atlas
    if (item.quantity < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient inventory. Only ${item.quantity} units are available.`
      });
    }

    // 7. Server-side quantity reduction & Usage record creation
    item.quantity -= qty;
    await item.save();

    const usage = new InventoryUsage({
      item: item._id,
      project: project._id,
      quantity: qty,
      location: item.location.code,
      notes: noteText
    });

    await usage.save();

    res.status(201).json({
      success: true,
      message: `${qty} ${item.name} unit(s) taken for ${project.name}.`,
      data: {
        usage,
        item,
        project
      }
    });
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

// @desc    Get all inventory withdrawal records with filtering & pagination
// @route   GET /api/usage
// @access  Public
exports.getAllUsage = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', itemId = '', projectId = '', dateRange = 'all' } = req.query;

    const query = {};

    if (itemId && isValidId(itemId)) {
      query.item = itemId;
    }

    if (projectId && isValidId(projectId)) {
      query.project = projectId;
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
        query.createdAt = { $gte: startDate };
      }
    }

    const trimmedSearch = String(search).trim();
    if (trimmedSearch) {
      const searchRegex = new RegExp(trimmedSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

      const matchingItems = await InventoryItem.find({ name: searchRegex }).select('_id');
      const matchingItemIds = matchingItems.map(i => i._id);

      const matchingProjects = await Project.find({ name: searchRegex }).select('_id');
      const matchingProjectIds = matchingProjects.map(p => p._id);

      const searchConditions = [
        { location: searchRegex },
        { notes: searchRegex },
        { item: { $in: matchingItemIds } },
        { project: { $in: matchingProjectIds } }
      ];

      query.$or = searchConditions;
    }

    const total = await InventoryUsage.countDocuments(query);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum) || 1;

    const usages = await InventoryUsage.find(query)
      .populate('item', 'name image location quantity')
      .populate('project', 'name status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: usages.length,
      total,
      page: pageNum,
      totalPages,
      data: usages
    });
  } catch (error) {
    console.error('Get All Usage Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve usage records.'
    });
  }
};

// @desc    Get usage records and item summary for a specific inventory item
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

    const usages = await InventoryUsage.find({ item: itemId })
      .populate('item', 'name image location quantity')
      .populate('project', 'name status')
      .sort({ createdAt: -1 });

    let totalUnitsUsed = 0;
    const uniqueProjects = new Set();

    usages.forEach((rec) => {
      totalUnitsUsed += Number(rec.quantity) || 0;
      if (rec.project) {
        const pId = rec.project._id ? String(rec.project._id) : String(rec.project);
        uniqueProjects.add(pId);
      }
    });

    res.status(200).json({
      success: true,
      summary: {
        currentStock: item.quantity,
        totalUnitsUsed,
        projectsCount: uniqueProjects.size
      },
      data: usages
    });
  } catch (error) {
    console.error('Get Item Usage Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve item usage records.'
    });
  }
};

