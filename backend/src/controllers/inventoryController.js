const InventoryItem = require('../models/InventoryItem');
const mongoose = require('mongoose');

// Helper to validate ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper to validate location code consistency
const validateLocationCode = (location) => {
  if (!location) return { isValid: false, message: 'Location parameters are required' };
  
  const { section, storageUnit, box, code } = location;
  
  if (!section || storageUnit === undefined || box === undefined || !code) {
    return { isValid: false, message: 'Location must contain section, storageUnit, box, and code' };
  }
  
  const sec = String(section).trim().toUpperCase();
  const su = Number(storageUnit);
  const bx = Number(box);
  const providedCode = String(code).trim().toUpperCase();
  
  if (isNaN(su) || !Number.isInteger(su) || su < 1) {
    return { isValid: false, message: 'Location storageUnit must be an integer >= 1' };
  }
  
  if (isNaN(bx) || !Number.isInteger(bx) || bx < 1) {
    return { isValid: false, message: 'Location box must be an integer >= 1' };
  }
  
  const expectedCode = `${sec}${su}${bx}`;
  if (providedCode !== expectedCode) {
    return {
      isValid: false,
      message: `Inconsistent location data: code '${code}' does not match expected '${expectedCode}' based on section '${section}', storageUnit '${storageUnit}', and box '${box}'.`
    };
  }
  
  return { isValid: true };
};

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Public
exports.createInventoryItem = async (req, res) => {
  try {
    const { name, image, quantity, location } = req.body;
    
    // Explicit Validation Check before Mongoose schema to return clear errors
    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required'
      });
    }

    if (quantity !== undefined) {
      const q = Number(quantity);
      if (isNaN(q) || !Number.isInteger(q) || q < 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive integer'
        });
      }
    }
    
    const locationCheck = validateLocationCode(location);
    if (!locationCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: locationCheck.message
      });
    }
    
    const item = new InventoryItem({
      name,
      image,
      quantity,
      location
    });
    
    await item.save();
    
    res.status(201).json({
      success: true,
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
    
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred'
    });
  }
};

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Public
exports.getInventoryItems = async (req, res) => {
  try {
    const items = await InventoryItem.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred'
    });
  }
};

// @desc    Get inventory item by ID
// @route   GET /api/inventory/:id
// @access  Public
exports.getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID format'
      });
    }
    
    const item = await InventoryItem.findById(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred'
    });
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Public
exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, quantity, location } = req.body;
    
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID format'
      });
    }
    
    // Explicit Validation Check
    if (name !== undefined && String(name).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item name cannot be empty'
      });
    }

    if (quantity !== undefined) {
      const q = Number(quantity);
      if (isNaN(q) || !Number.isInteger(q) || q < 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive integer'
        });
      }
    }
    
    if (location !== undefined) {
      const locationCheck = validateLocationCode(location);
      if (!locationCheck.isValid) {
        return res.status(400).json({
          success: false,
          message: locationCheck.message
        });
      }
    }
    
    const item = await InventoryItem.findById(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }
    
    // Apply changes
    if (name !== undefined) item.name = name;
    if (image !== undefined) item.image = image;
    if (quantity !== undefined) item.quantity = quantity;
    if (location !== undefined) item.location = location;
    
    await item.save();
    
    res.status(200).json({
      success: true,
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
    
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred'
    });
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Public
exports.deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID format'
      });
    }
    
    const item = await InventoryItem.findById(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }
    
    await item.deleteOne();
    
    res.status(200).json({
      success: true,
      data: { id }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred'
    });
  }
};
