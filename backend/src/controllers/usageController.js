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

// @desc    Get all inventory withdrawal records
// @route   GET /api/usage
// @access  Public
exports.getAllUsage = async (req, res) => {
  try {
    const usages = await InventoryUsage.find({})
      .populate('item', 'name image location')
      .populate('project', 'name status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
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

// @desc    Get usage records for a specific inventory item
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

    const usages = await InventoryUsage.find({ item: itemId })
      .populate('item', 'name image location')
      .populate('project', 'name status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
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
