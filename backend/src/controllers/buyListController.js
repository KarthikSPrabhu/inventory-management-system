const BuyListItem = require('../models/BuyListItem');
const InventoryItem = require('../models/InventoryItem');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Get all buy list items with optional search & current inventory stock lookup
// @route   GET /api/buy-list
// @access  Private (requireAuth)
exports.getBuyListItems = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const query = {};

    const trimmedSearch = String(search).trim();
    if (trimmedSearch) {
      const searchRegex = new RegExp(trimmedSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      query.$or = [
        { name: searchRegex },
        { note: searchRegex }
      ];
    }

    const buyListItems = await BuyListItem.find(query).sort({ status: 1, createdAt: -1 });
    const inventoryItems = await InventoryItem.find({}).select('name quantity location');

    // Build case-insensitive map for matching inventory stock
    const invMap = new Map();
    inventoryItems.forEach(item => {
      invMap.set(item.name.toLowerCase().trim(), item);
    });

    const enrichedItems = buyListItems.map(item => {
      const match = invMap.get(item.name.toLowerCase().trim());
      return {
        ...item.toObject(),
        inventoryStock: match ? match.quantity : null,
        inventoryLocation: match ? match.location?.code : null,
        inventoryItemId: match ? match._id : null
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedItems.length,
      data: enrichedItems
    });
  } catch (error) {
    console.error('Get Buy List Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve buy list items.'
    });
  }
};

// @desc    Create new buy list item
// @route   POST /api/buy-list
// @access  Private (requireAuth, requireRole('admin'))
exports.createBuyListItem = async (req, res) => {
  try {
    const { name, quantityNeeded, note } = req.body;

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required'
      });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Item name cannot exceed 100 characters'
      });
    }

    const qty = Number(quantityNeeded);
    if (isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity needed must be a positive whole number (at least 1)'
      });
    }

    const noteText = String(note || '').trim();
    if (noteText.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Note cannot exceed 500 characters'
      });
    }

    const item = new BuyListItem({
      name: trimmedName,
      quantityNeeded: qty,
      note: noteText,
      status: 'NEEDED'
    });

    await item.save();

    res.status(201).json({
      success: true,
      message: `"${item.name}" added to Buy List.`,
      data: item
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    console.error('Create Buy List Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to add item to Buy List.'
    });
  }
};

// @desc    Update buy list item (toggle status, update quantity / note)
// @route   PATCH /api/buy-list/:id
// @access  Private (requireAuth)
exports.updateBuyListItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, quantityNeeded, note, name } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid buy list item ID format'
      });
    }

    const item = await BuyListItem.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Buy list item not found'
      });
    }

    if (status !== undefined) {
      const validStatuses = ['NEEDED', 'BOUGHT'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be NEEDED or BOUGHT'
        });
      }
      item.status = status;
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: 'Item name cannot be empty'
        });
      }
      item.name = trimmedName;
    }

    if (quantityNeeded !== undefined) {
      const qty = Number(quantityNeeded);
      if (isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity needed must be a positive integer'
        });
      }
      item.quantityNeeded = qty;
    }

    if (note !== undefined) {
      const noteText = String(note).trim();
      if (noteText.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Note cannot exceed 500 characters'
        });
      }
      item.note = noteText;
    }

    await item.save();

    res.status(200).json({
      success: true,
      message: `Buy list item updated.`,
      data: item
    });
  } catch (error) {
    console.error('Update Buy List Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to update buy list item.'
    });
  }
};

// @desc    Delete buy list item
// @route   DELETE /api/buy-list/:id
// @access  Private (requireAuth, requireRole('admin'))
exports.deleteBuyListItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid buy list item ID format'
      });
    }

    const item = await BuyListItem.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Buy list item not found'
      });
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: `"${item.name}" removed from Buy List.`,
      data: { id }
    });
  } catch (error) {
    console.error('Delete Buy List Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to remove item from Buy List.'
    });
  }
};
