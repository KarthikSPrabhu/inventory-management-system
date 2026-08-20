const InventoryItem = require('../models/InventoryItem');
const InventoryUsage = require('../models/InventoryUsage');
const InventoryStockIn = require('../models/InventoryStockIn');
const { deepPopulateLocation, generateLocationDisplayId } = require('../utils/locationUtils');
const notificationService = require('../services/notificationService');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../utils/auditActions');
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
    const { name, image, quantity, locationId, lowStockThreshold, category, minimumStock, maximumStock } = req.body;
    
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
    
    if (!isValidId(locationId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid physical location ID is required'
      });
    }
    
    const item = new InventoryItem({
      name,
      image,
      quantity,
      locations: [{ node: locationId, quantity: quantity || 0 }],
      lowStockThreshold: thresholdVal,
      minimumStock: thresholdVal,
      maximumStock: maxStockVal,
      category: category ? String(category).trim() : 'Other'
    });
    
    await item.save();
    
    // Log Audit Event
    await auditService.log({
      req,
      action: AUDIT_ACTIONS.CREATE,
      resourceType: 'InventoryItem',
      resourceId: item._id,
      resourceName: item.name,
      description: `Created new inventory item "${item.name}" with initial quantity ${item.quantity || 0}`,
      newState: item.toObject ? item.toObject() : item,
      metadata: { category: item.category, minimumStock: item.minimumStock, quantity: item.quantity }
    });

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

const StorageNode = require('../models/StorageNode');
const Project = require('../models/Project');
const BuyListItem = require('../models/BuyListItem');

// Helper to get hierarchical storage nodes map & descendant collector
const getStorageHierarchyHelper = async () => {
  const nodes = await StorageNode.find().lean();
  const nodeMap = new Map();
  const childrenMap = new Map();

  nodes.forEach((node) => {
    nodeMap.set(String(node._id), node);
    const pId = node.parentId ? String(node.parentId) : null;
    if (!childrenMap.has(pId)) childrenMap.set(pId, []);
    childrenMap.get(pId).push(node);
  });

  const getPathCodes = (node) => {
    const path = [];
    let current = node;
    while (current) {
      path.unshift(current.code);
      current = current.parentId ? nodeMap.get(String(current.parentId)) : null;
    }
    return path;
  };

  nodes.forEach((node) => {
    node.displayId = generateLocationDisplayId(getPathCodes(node));
  });

  const getDescendantIds = (startNodeId) => {
    const startStr = String(startNodeId);
    const result = new Set([startStr]);
    const queue = [startStr];
    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = childrenMap.get(currentId) || [];
      for (const child of children) {
        const cId = String(child._id);
        if (!result.has(cId)) {
          result.add(cId);
          queue.push(cId);
        }
      }
    }
    return Array.from(result);
  };

  return { nodes, nodeMap, childrenMap, getDescendantIds };
};

// @desc    Get all unique inventory categories
// @route   GET /api/inventory/categories
// @access  Private (requireAuth)
exports.getInventoryCategories = async (req, res) => {
  try {
    const categories = await InventoryItem.distinct('category', { isArchived: { $ne: true } });
    const cleaned = categories.map(c => (c || '').trim()).filter(Boolean);
    const uniqueCategories = Array.from(new Set(cleaned)).sort();
    
    res.status(200).json({
      success: true,
      data: uniqueCategories
    });
  } catch (error) {
    console.error('Get Inventory Categories Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories'
    });
  }
};

// @desc    Get all inventory items with advanced search, location-hierarchy filtering, project & buy list filters, sorting & pagination
// @route   GET /api/inventory
// @access  Private (requireAuth)
exports.getInventoryItems = async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      section,
      storageUnit,
      locationNode,
      container,
      status,
      category,
      project,
      buyList,
      sort
    } = req.query;

    const baseQuery = { isArchived: { $ne: true } };
    const queryAndConditions = [baseQuery];

    // Helper for intersecting matching node ID arrays
    let allowedNodeIds = null;
    const intersectNodeIds = (newIds) => {
      const newSet = new Set(newIds.map(String));
      if (allowedNodeIds === null) {
        allowedNodeIds = newSet;
      } else {
        allowedNodeIds = new Set(Array.from(allowedNodeIds).filter(id => newSet.has(id)));
      }
    };

    // Helper for intersecting matching item ID arrays
    let allowedItemIds = null;
    const intersectItemIds = (newIds) => {
      const newSet = new Set(newIds.map(String));
      if (allowedItemIds === null) {
        allowedItemIds = newSet;
      } else {
        allowedItemIds = new Set(Array.from(allowedItemIds).filter(id => newSet.has(id)));
      }
    };

    const storageHelper = await getStorageHierarchyHelper();

    // 1. SECTION FILTER (A, B)
    if (section && section !== 'All') {
      const secUpper = String(section).trim().toUpperCase();
      const sectionNodes = storageHelper.nodes.filter(n => n.section === secUpper);
      const sectionNodeIds = [];
      sectionNodes.forEach(n => {
        const desc = storageHelper.getDescendantIds(n._id);
        sectionNodeIds.push(...desc);
      });
      intersectNodeIds(sectionNodeIds);
    }

    // 2. STORAGE UNIT FILTER (A01..A06, B01..B02, unit number, code, or node ID)
    const unitQuery = storageUnit || req.query.unit;
    if (unitQuery && unitQuery !== 'All') {
      const uStr = String(unitQuery).trim();
      const targetUnitNodes = storageHelper.nodes.filter(n => 
        String(n._id) === uStr ||
        n.displayId.toUpperCase() === uStr.toUpperCase() ||
        n.code.toUpperCase() === uStr.toUpperCase() ||
        (n.type === 'STORAGE_UNIT' && (n.code === uStr || n.code === uStr.padStart(2, '0') || String(parseInt(n.code, 10)) === uStr))
      );

      const unitNodeIds = [];
      targetUnitNodes.forEach(n => {
        unitNodeIds.push(...storageHelper.getDescendantIds(n._id));
      });
      intersectNodeIds(unitNodeIds);
    }

    // 3. CONTAINER / NESTED LOCATION FILTER
    const containerQuery = container || locationNode;
    if (containerQuery && containerQuery !== 'All') {
      const cStr = String(containerQuery).trim();
      const targetContainerNodes = storageHelper.nodes.filter(n => 
        String(n._id) === cStr ||
        n.displayId.toUpperCase() === cStr.toUpperCase() ||
        n.code.toUpperCase() === cStr.toUpperCase()
      );

      const containerNodeIds = [];
      targetContainerNodes.forEach(n => {
        containerNodeIds.push(...storageHelper.getDescendantIds(n._id));
      });
      intersectNodeIds(containerNodeIds);
    }

    // Apply allowed node IDs if location filters were used
    if (allowedNodeIds !== null) {
      const nodeArray = Array.from(allowedNodeIds);
      queryAndConditions.push({ 'locations.node': { $in: nodeArray } });
    }

    // 4. CATEGORY FILTER
    if (category && category !== 'All') {
      queryAndConditions.push({ category: String(category).trim() });
    }

    // 5. STOCK STATUS FILTER
    if (status && status !== 'All') {
      if (status === 'Out of Stock') {
        queryAndConditions.push({ quantity: 0 });
      } else if (status === 'Low Stock') {
        queryAndConditions.push({
          quantity: { $gt: 0 },
          $expr: {
            $lte: [
              '$quantity',
              {
                $cond: [
                  { $gt: ['$minimumStock', 0] },
                  '$minimumStock',
                  { $ifNull: ['$lowStockThreshold', 5] }
                ]
              }
            ]
          }
        });
      } else if (status === 'In Stock') {
        queryAndConditions.push({
          $expr: {
            $gt: [
              '$quantity',
              {
                $cond: [
                  { $gt: ['$minimumStock', 0] },
                  '$minimumStock',
                  { $ifNull: ['$lowStockThreshold', 5] }
                ]
              }
            ]
          }
        });
      }
    }

    // 6. PROJECT FILTER
    if (project && project !== 'All') {
      const projStr = String(project).trim();
      let targetProjectId = null;
      if (isValidId(projStr)) {
        targetProjectId = projStr;
      } else {
        const foundProj = await Project.findOne({
          name: { $regex: new RegExp(`^${projStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
        });
        if (foundProj) targetProjectId = foundProj._id;
      }

      if (targetProjectId) {
        const usageItems = await InventoryUsage.find({ project: targetProjectId }).distinct('item');
        intersectItemIds(usageItems);
      } else {
        intersectItemIds([]);
      }
    }

    // 7. BUY LIST FILTER
    if (buyList && buyList !== 'All') {
      const buyListEntries = await BuyListItem.find({ status: 'NEEDED' }).select('name');
      const neededNames = buyListEntries.map(b => b.name.trim().toLowerCase());
      
      const allActiveItems = await InventoryItem.find({ isArchived: { $ne: true } }).select('_id name');
      const matchingBuyItemIds = allActiveItems
        .filter(it => neededNames.includes(it.name.trim().toLowerCase()))
        .map(it => String(it._id));

      if (buyList === 'On Buy List' || buyList === 'true' || buyList === 'on') {
        intersectItemIds(matchingBuyItemIds);
      } else if (buyList === 'Not On Buy List' || buyList === 'false' || buyList === 'off') {
        queryAndConditions.push({ _id: { $nin: matchingBuyItemIds } });
      }
    }

    if (allowedItemIds !== null) {
      const itemArray = Array.from(allowedItemIds);
      queryAndConditions.push({ _id: { $in: itemArray } });
    }

    // 8. PROMINENT MAIN SEARCH BAR (Search query)
    if (search && String(search).trim()) {
      const rawSearch = String(search).trim();
      const searchRegex = new RegExp(rawSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

      // Search location hierarchy
      const matchingSearchNodes = storageHelper.nodes.filter(n => 
        n.displayId.toLowerCase().includes(rawSearch.toLowerCase()) ||
        n.code.toLowerCase().includes(rawSearch.toLowerCase()) ||
        n.name.toLowerCase().includes(rawSearch.toLowerCase())
      );

      const searchNodeIds = [];
      matchingSearchNodes.forEach(n => {
        searchNodeIds.push(...storageHelper.getDescendantIds(n._id));
      });

      // Search Projects
      const matchingProjects = await Project.find({ name: searchRegex }).select('_id');
      let searchProjectItemIds = [];
      if (matchingProjects.length > 0) {
        searchProjectItemIds = await InventoryUsage.find({ project: { $in: matchingProjects.map(p => p._id) } }).distinct('item');
      }

      // Search Buy List
      const matchingBuyList = await BuyListItem.find({ name: searchRegex, status: 'NEEDED' }).select('name');
      let searchBuyItemIds = [];
      if (matchingBuyList.length > 0) {
        const buyNames = matchingBuyList.map(b => b.name.trim().toLowerCase());
        const activeItemsForBuy = await InventoryItem.find({ isArchived: { $ne: true } }).select('_id name');
        searchBuyItemIds = activeItemsForBuy.filter(i => buyNames.includes(i.name.trim().toLowerCase())).map(i => i._id);
      }

      const searchOrClauses = [
        { name: searchRegex },
        { category: searchRegex },
        { 'location.code': searchRegex },
        { 'location.section': searchRegex }
      ];

      if (searchNodeIds.length > 0) {
        searchOrClauses.push({ 'locations.node': { $in: searchNodeIds } });
      }
      if (searchProjectItemIds.length > 0) {
        searchOrClauses.push({ _id: { $in: searchProjectItemIds } });
      }
      if (searchBuyItemIds.length > 0) {
        searchOrClauses.push({ _id: { $in: searchBuyItemIds } });
      }

      queryAndConditions.push({ $or: searchOrClauses });
    }

    const finalQuery = queryAndConditions.length === 1 ? queryAndConditions[0] : { $and: queryAndConditions };

    // 9. SORTING
    let sortObj = { updatedAt: -1 };
    let isUsageSort = false;
    let usageSortOrder = 'desc';

    if (sort) {
      if (sort === 'Name A-Z' || sort === 'name_asc') sortObj = { name: 1 };
      else if (sort === 'Name Z-A' || sort === 'name_desc') sortObj = { name: -1 };
      else if (sort === 'Quantity Low-High' || sort === 'qty_asc') sortObj = { quantity: 1 };
      else if (sort === 'Quantity High-Low' || sort === 'qty_desc') sortObj = { quantity: -1 };
      else if (sort === 'Recently Added' || sort === 'created_desc') sortObj = { createdAt: -1 };
      else if (sort === 'Recently Updated' || sort === 'updated_desc') sortObj = { updatedAt: -1 };
      else if (sort === 'Most Used' || sort === 'most_used') {
        isUsageSort = true;
        usageSortOrder = 'desc';
      } else if (sort === 'Least Used' || sort === 'least_used') {
        isUsageSort = true;
        usageSortOrder = 'asc';
      }
    }

    // Fetch items with deep populated storage node locations
    let items = await InventoryItem.find(finalQuery).populate(deepPopulateLocation).sort(isUsageSort ? {} : sortObj);

    // If sorting by Usage
    if (isUsageSort) {
      const usageAgg = await InventoryUsage.aggregate([
        { $group: { _id: '$item', totalUsed: { $sum: '$quantity' } } }
      ]);
      const usageMap = new Map();
      usageAgg.forEach(u => usageMap.set(String(u._id), u.totalUsed));

      items.sort((a, b) => {
        const uA = usageMap.get(String(a._id)) || 0;
        const uB = usageMap.get(String(b._id)) || 0;
        return usageSortOrder === 'desc' ? uB - uA : uA - uB;
      });
    }

    const total = items.length;

    // 10. PAGINATION
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page || 1, 10));
      const limitNum = Math.max(1, parseInt(limit || 20, 10));
      const totalPages = Math.ceil(total / limitNum) || 1;
      const skip = (pageNum - 1) * limitNum;
      const paginatedItems = items.slice(skip, skip + limitNum);

      return res.status(200).json({
        success: true,
        count: paginatedItems.length,
        total,
        page: pageNum,
        totalPages,
        limit: limitNum,
        data: paginatedItems
      });
    }

    res.status(200).json({
      success: true,
      count: items.length,
      total: items.length,
      page: 1,
      totalPages: 1,
      limit: items.length,
      data: items
    });
  } catch (error) {
    console.error('Get Inventory Items Error:', error);
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
    
    const item = await InventoryItem.findById(id).populate(deepPopulateLocation);
    
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
    const { name, image, lowStockThreshold, category, minimumStock, maximumStock } = req.body;
    
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
    
    const prevSnapshot = item.toObject ? item.toObject() : { ...item };
    await item.save();
    
    // Trigger Notifications in background
    notificationService.checkItemThresholds(item, req.user);
    
    // Log Audit Event
    await auditService.log({
      req,
      action: AUDIT_ACTIONS.UPDATE,
      resourceType: 'InventoryItem',
      resourceId: item._id,
      resourceName: item.name,
      description: `Updated inventory item details for "${item.name}"`,
      previousState: prevSnapshot,
      newState: item.toObject ? item.toObject() : item,
      metadata: { category: item.category, quantity: item.quantity, minimumStock: item.minimumStock }
    });

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
      
      await auditService.log({
        req,
        action: AUDIT_ACTIONS.ARCHIVE,
        resourceType: 'InventoryItem',
        resourceId: item._id,
        resourceName: item.name,
        description: `Archived inventory item "${item.name}" to preserve historical integrity`,
        previousState: item.toObject ? item.toObject() : item,
        metadata: { isArchived: true }
      });

      return res.status(200).json({
        success: true,
        message: 'Item has historical activity and was successfully archived.',
        data: { id, archived: true }
      });
    }
    
    await item.deleteOne();
    
    await auditService.log({
      req,
      action: AUDIT_ACTIONS.DELETE,
      resourceType: 'InventoryItem',
      resourceId: item._id,
      resourceName: item.name,
      description: `Deleted inventory item "${item.name}"`,
      previousState: item.toObject ? item.toObject() : item
    });

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

// @desc    Move stock between physical locations
// @route   POST /api/inventory/:id/move
// @access  Private (requireAuth)
exports.moveItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromLocationId, toLocationId, quantity } = req.body;

    if (!isValidId(id) || !isValidId(fromLocationId) || !isValidId(toLocationId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID formats provided.' });
    }

    if (fromLocationId === toLocationId) {
      return res.status(400).json({ success: false, message: 'Source and destination locations cannot be the same.' });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Move quantity must be a positive integer.' });
    }

    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    try {
      // 1. Deduct from source location
      const decResult = await InventoryItem.updateOne(
        { 
          _id: id, 
          'locations': { $elemMatch: { node: fromLocationId, quantity: { $gte: qty } } } 
        },
        { $inc: { 'locations.$.quantity': -qty } },
        { session: session || undefined }
      );

      if (decResult.matchedCount === 0) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Insufficient stock at the source location.' });
      }

      // 2. Add to destination location
      const incResult = await InventoryItem.updateOne(
        { _id: id, 'locations.node': toLocationId },
        { $inc: { 'locations.$.quantity': qty } },
        { session: session || undefined }
      );

      if (incResult.matchedCount === 0) {
        // Destination doesn't exist in array yet, so push it
        const pushResult = await InventoryItem.updateOne(
          { _id: id, 'locations.node': { $ne: toLocationId } },
          { $push: { locations: { node: toLocationId, quantity: qty } } },
          { session: session || undefined }
        );

        if (pushResult.matchedCount === 0) {
          // Very rare race condition where it was added midway
          await InventoryItem.updateOne(
            { _id: id, 'locations.node': toLocationId },
            { $inc: { 'locations.$.quantity': qty } },
            { session: session || undefined }
          );
        }
      }

      const item = await InventoryItem.findById(id).populate(deepPopulateLocation).session(session || undefined);
      
      // Remove any location elements that hit 0 to clean up
      item.locations = item.locations.filter(l => l.quantity > 0);
      await item.save(session ? { session } : undefined);

      // Record this move in InventoryAdjustment/Usage history? The prompt says "Verify history records the move."
      // I should create an InventoryAdjustment record representing this move.
      const InventoryAdjustment = require('../models/InventoryAdjustment');
      const adjustment = new InventoryAdjustment({
        item: item._id,
        difference: 0, // overall difference is 0
        previousQuantity: item.quantity,
        newQuantity: item.quantity,
        reason: 'Moved physically',
        notes: `Moved ${qty} units from location ${fromLocationId} to ${toLocationId}`
      });
      await adjustment.save(session ? { session } : undefined);

      if (session) await session.commitTransaction();

      // Resolve hierarchical display IDs for source and destination locations
      const getPathCodesHelper = (node) => {
        const path = [];
        let curr = node;
        while (curr) {
          path.unshift(curr.code);
          curr = curr.parentId;
        }
        return path;
      };

      const [fromNodeDoc, toNodeDoc] = await Promise.all([
        StorageNode.findById(fromLocationId).populate({ path: 'parentId', populate: { path: 'parentId', populate: { path: 'parentId' } } }),
        StorageNode.findById(toLocationId).populate({ path: 'parentId', populate: { path: 'parentId', populate: { path: 'parentId' } } })
      ]);

      const fromDisplay = fromNodeDoc ? generateLocationDisplayId(getPathCodesHelper(fromNodeDoc)) : fromLocationId;
      const toDisplay = toNodeDoc ? generateLocationDisplayId(getPathCodesHelper(toNodeDoc)) : toLocationId;

      await auditService.log({
        req,
        action: AUDIT_ACTIONS.STOCK_MOVE,
        resourceType: 'InventoryItem',
        resourceId: item._id,
        resourceName: item.name,
        description: `Moved ${qty} units of "${item.name}" from ${fromDisplay} to ${toDisplay}`,
        metadata: {
          quantity: qty,
          fromLocationId,
          toLocationId,
          fromLocationDisplay: fromDisplay,
          toLocationDisplay: toDisplay,
          totalQuantity: item.quantity
        }
      });

      return res.status(200).json({
        success: true,
        message: `Successfully moved ${qty} units.`,
        data: item
      });
    } catch (dbErr) {
      if (session) await session.abortTransaction();
      throw dbErr;
    } finally {
      if (session) session.endSession();
    }
  } catch (error) {
    console.error('Move Item Error:', error);
    res.status(500).json({ success: false, message: 'Failed to move item.' });
  }
};

