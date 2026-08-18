const StorageNode = require('../models/StorageNode');
const InventoryItem = require('../models/InventoryItem');
const { formatLocationSegment, generateLocationDisplayId } = require('../utils/locationUtils');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Recursively builds the tree and assigns formatted location display IDs
const buildStorageTree = (nodes, parentId = null, parentCodePath = []) => {
  const children = nodes.filter(node => 
    (parentId === null && node.parentId === null) ||
    (node.parentId && node.parentId.toString() === parentId.toString())
  );

  return children.map(node => {
    const currentCodePath = [...parentCodePath, node.code];
    const displayId = generateLocationDisplayId(currentCodePath);
    
    // Sort logic (for consistent display A01, A02)
    return {
      _id: node._id,
      name: node.name,
      type: node.type,
      section: node.section,
      code: node.code,
      displayId,
      createdAt: node.createdAt,
      children: buildStorageTree(nodes, node._id, currentCodePath).sort((a, b) => a.displayId.localeCompare(b.displayId))
    };
  }).sort((a, b) => a.displayId.localeCompare(b.displayId));
};

// @desc    Get complete hierarchical storage tree
// @route   GET /api/storage/tree
// @access  Private (requireAuth)
exports.getStorageTree = async (req, res) => {
  try {
    const nodes = await StorageNode.find().lean();
    const tree = buildStorageTree(nodes);
    
    res.status(200).json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Get Storage Tree Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve storage structure.' });
  }
};

// @desc    Create a new storage node
// @route   POST /api/storage
// @access  Private (requireAuth, requireRole('admin'))
exports.createStorageNode = async (req, res) => {
  try {
    const { name, type, parentId, section, code } = req.body;
    
    const node = new StorageNode({
      name,
      type,
      parentId: parentId || null,
      section,
      code
    });

    await node.save();
    
    res.status(201).json({
      success: true,
      message: `${type} '${name}' created successfully.`,
      data: node
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    // Also catch explicit errors thrown by the pre-save hook
    if (error.message && error.message.includes('cannot')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    console.error('Create Storage Node Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create storage node.' });
  }
};

// @desc    Delete a storage node
// @route   DELETE /api/storage/:id
// @access  Private (requireAuth, requireRole('admin'))
exports.deleteStorageNode = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid node ID.' });
    }
    
    // 1. Check if it has child nodes
    const childrenCount = await StorageNode.countDocuments({ parentId: id });
    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'This location contains nested containers and cannot be deleted.'
      });
    }

    // 2. Check if any inventory resides here
    const inventoryCount = await InventoryItem.countDocuments({ 'locations.node': id });
    if (inventoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'This location contains inventory items and cannot be deleted.'
      });
    }

    await StorageNode.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Storage node deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Storage Node Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete storage node.' });
  }
};

// @desc    Resolve or safely create StorageNode path
// @route   POST /api/storage/resolve
// @access  Private (requireAuth)
exports.resolveStoragePath = async (req, res) => {
  try {
    const { section, storageUnit, boxes = [] } = req.body;

    if (!section || !String(section).trim()) {
      return res.status(400).json({ success: false, message: 'Section is required.' });
    }
    const secStr = String(section).trim().toUpperCase();

    if (storageUnit === undefined || storageUnit === null || String(storageUnit).trim() === '') {
      return res.status(400).json({ success: false, message: 'Storage Unit is required.' });
    }

    const unitNum = Number(storageUnit);
    if (isNaN(unitNum) || !Number.isInteger(unitNum) || unitNum < 1 || unitNum > 6) {
      return res.status(400).json({ success: false, message: 'Primary Storage Unit must be an integer between 1 and 6.' });
    }

    const cleanBoxes = [];
    if (Array.isArray(boxes)) {
      for (let i = 0; i < boxes.length; i++) {
        const rawBox = boxes[i];
        if (rawBox === undefined || rawBox === null || String(rawBox).trim() === '') {
          return res.status(400).json({ success: false, message: `Box ${i + 1} number is required.` });
        }
        const bNum = Number(rawBox);
        if (isNaN(bNum) || !Number.isInteger(bNum) || bNum < 1) {
          return res.status(400).json({ success: false, message: `Box ${i + 1} must be a positive integer.` });
        }
        cleanBoxes.push(String(bNum));
      }
    }

    // 1. Ensure SECTION
    let sectionNode = await StorageNode.findOne({ type: 'SECTION', section: secStr, parentId: null });
    if (!sectionNode) {
      sectionNode = new StorageNode({
        name: `Section ${secStr}`,
        type: 'SECTION',
        section: secStr,
        code: secStr,
        parentId: null
      });
      await sectionNode.save();
    }

    // 2. Ensure STORAGE_UNIT
    const unitCode = formatLocationSegment(unitNum);
    let unitNode = await StorageNode.findOne({
      type: 'STORAGE_UNIT',
      parentId: sectionNode._id,
      $or: [{ code: unitCode }, { code: String(unitNum) }]
    });

    if (!unitNode) {
      unitNode = new StorageNode({
        name: `Storage Unit ${unitCode}`,
        type: 'STORAGE_UNIT',
        section: secStr,
        code: unitCode,
        parentId: sectionNode._id
      });
      await unitNode.save();
    }

    // 3. Ensure CONTAINERS (Boxes)
    let currentParent = unitNode;
    const pathNodes = [sectionNode, unitNode];

    for (let i = 0; i < cleanBoxes.length; i++) {
      const boxCode = formatLocationSegment(cleanBoxes[i]);
      let containerNode = await StorageNode.findOne({
        type: 'CONTAINER',
        parentId: currentParent._id,
        $or: [{ code: boxCode }, { code: cleanBoxes[i] }]
      });

      if (!containerNode) {
        containerNode = new StorageNode({
          name: `Box ${boxCode}`,
          type: 'CONTAINER',
          section: secStr,
          code: boxCode,
          parentId: currentParent._id
        });
        await containerNode.save();
      }
      currentParent = containerNode;
      pathNodes.push(containerNode);
    }

    const displayId = generateLocationDisplayId(pathNodes.map(n => n.code));

    res.status(200).json({
      success: true,
      data: {
        node: currentParent,
        nodeId: currentParent._id,
        displayId,
        path: pathNodes
      }
    });
  } catch (error) {
    console.error('Resolve Storage Path Error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve storage location.' });
  }
};

