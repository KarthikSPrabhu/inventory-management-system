const InventoryItem = require('../models/InventoryItem');
const InventoryUsage = require('../models/InventoryUsage');
const InventoryStockIn = require('../models/InventoryStockIn');
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
    const { name, image, quantity, location, lowStockThreshold, category, minimumStock, maximumStock } = req.body;
    
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

    let thresholdVal = 5;
    if (minimumStock !== undefined) {
      const t = Number(minimumStock);
      if (isNaN(t) || !Number.isInteger(t) || t < 0) {
        return res.status(400).json({ success: false, message: 'Minimum stock must be a non-negative integer' });
      }
      thresholdVal = t;
    } else if (lowStockThreshold !== undefined) {
      const t = Number(lowStockThreshold);
      if (isNaN(t) || !Number.isInteger(t) || t < 0) {
        return res.status(400).json({ success: false, message: 'Low stock threshold must be a non-negative integer' });
      }
      thresholdVal = t;
    }

    let maxStockVal = 0;
    if (maximumStock !== undefined) {
      const max = Number(maximumStock);
      if (isNaN(max) || !Number.isInteger(max) || max < 0) {
        return res.status(400).json({ success: false, message: 'Maximum stock must be a non-negative integer' });
      }
      maxStockVal = max;
    }

    if (maxStockVal > 0 && thresholdVal > maxStockVal) {
      return res.status(400).json({ success: false, message: 'Minimum stock cannot be greater than maximum stock' });
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
      location,
      lowStockThreshold: thresholdVal,
      minimumStock: thresholdVal,
      maximumStock: maxStockVal,
      category: category ? String(category).trim() : 'Other'
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
    const { page, limit, search, category, status, sort } = req.query;

    const query = { isArchived: { $ne: true } };

    if (search) {
      const searchRegex = new RegExp(String(search).trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      query.$or = [
        { name: searchRegex },
        { 'location.code': searchRegex },
        { 'location.section': searchRegex },
        { category: searchRegex }
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      if (status === 'Out of Stock') {
        query.quantity = 0;
      } else if (status === 'Low Stock') {
        query.quantity = { $gt: 0 };
        query.$expr = { $lte: ['$quantity', '$minimumStock'] };
      } else if (status === 'In Stock') {
        query.$expr = { $gt: ['$quantity', '$minimumStock'] };
      }
    }

    let sortObj = { createdAt: -1 };
    if (sort) {
      if (sort === 'Name A-Z') sortObj = { name: 1 };
      else if (sort === 'Name Z-A') sortObj = { name: -1 };
      else if (sort === 'Quantity Low-High') sortObj = { quantity: 1 };
      else if (sort === 'Quantity High-Low') sortObj = { quantity: -1 };
      else if (sort === 'Recently Updated') sortObj = { updatedAt: -1 };
    }

    // Pagination
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.max(1, parseInt(limit, 10));
      const skip = (pageNum - 1) * limitNum;

      const items = await InventoryItem.find(query).sort(sortObj).skip(skip).limit(limitNum);
      const total = await InventoryItem.countDocuments(query);
      const totalPages = Math.ceil(total / limitNum);

      return res.status(200).json({
        success: true,
        count: items.length,
        total,
        page: pageNum,
        totalPages,
        data: items
      });
    }

    // If no pagination requested, return all (for backward compatibility)
    const items = await InventoryItem.find(query).sort(sortObj);
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
    const { name, image, quantity, location, lowStockThreshold, category, minimumStock, maximumStock } = req.body;
    
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

    if (minimumStock !== undefined) {
      const t = Number(minimumStock);
      if (isNaN(t) || !Number.isInteger(t) || t < 0) {
        return res.status(400).json({ success: false, message: 'Minimum stock must be a non-negative integer' });
      }
    } else if (lowStockThreshold !== undefined) {
      const t = Number(lowStockThreshold);
      if (isNaN(t) || !Number.isInteger(t) || t < 0) {
        return res.status(400).json({ success: false, message: 'Low stock threshold must be a non-negative integer' });
      }
    }

    if (maximumStock !== undefined) {
      const max = Number(maximumStock);
      if (isNaN(max) || !Number.isInteger(max) || max < 0) {
        return res.status(400).json({ success: false, message: 'Maximum stock must be a non-negative integer' });
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
    if (category !== undefined) item.category = String(category).trim();
    if (minimumStock !== undefined) {
      item.minimumStock = Number(minimumStock);
      item.lowStockThreshold = Number(minimumStock); // Keep in sync
    } else if (lowStockThreshold !== undefined) {
      item.lowStockThreshold = Number(lowStockThreshold);
      item.minimumStock = Number(lowStockThreshold);
    }
    if (maximumStock !== undefined) item.maximumStock = Number(maximumStock);

    if (item.maximumStock > 0 && item.minimumStock > item.maximumStock) {
      return res.status(400).json({ success: false, message: 'Minimum stock cannot be greater than maximum stock' });
    }
    
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

    // Protect historical integrity: do not delete item if transaction history exists
    const hasUsage = await InventoryUsage.exists({ item: id });
    const hasStockIn = await InventoryStockIn.exists({ item: id });

    if (hasUsage || hasStockIn) {
      // Archive instead of hard delete
      item.isArchived = true;
      await item.save();
      
      return res.status(200).json({
        success: true,
        message: 'Item has historical activity and was successfully archived.',
        data: { id, archived: true }
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
