const InventoryItem = require('../models/InventoryItem');
const StorageNode = require('../models/StorageNode');
const Project = require('../models/Project');
const BuyListItem = require('../models/BuyListItem');
const InventoryUsage = require('../models/InventoryUsage');
const InventoryStockIn = require('../models/InventoryStockIn');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const { generateLocationDisplayId, deepPopulateLocation } = require('../utils/locationUtils');
const mongoose = require('mongoose');

// Helper to validate ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Lightweight CSV Parser Helper
const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = [];
  let currentLine = [];
  let currentToken = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentToken += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentLine.push(currentToken.trim());
      if (currentLine.some(cell => cell.length > 0)) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentToken = '';
    } else {
      currentToken += char;
    }
  }

  if (currentToken || currentLine.length > 0) {
    currentLine.push(currentToken.trim());
    if (currentLine.some(cell => cell.length > 0)) {
      lines.push(currentLine);
    }
  }

  if (lines.length < 2) return [];

  const rawHeaders = lines[0];
  const normalizedHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const rowObj = { _rawLineNumber: i + 1, _raw: {} };
    const line = lines[i];
    normalizedHeaders.forEach((h, index) => {
      const val = line[index] !== undefined ? line[index] : '';
      rowObj[h] = val;
      if (rawHeaders[index]) {
        rowObj._raw[rawHeaders[index]] = val;
      }
    });
    rows.push(rowObj);
  }

  return rows;
};

// CSV Export Generator Helper
const generateCSVString = (headers, rows) => {
  const escapeCell = (val) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(h => escapeCell(h.label)).join(',');
  const rowLines = rows.map(row => 
    headers.map(h => escapeCell(row[h.key])).join(',')
  );

  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
};

// Helper for StorageNode hierarchy lookup
const getStorageNodesMap = async () => {
  const nodes = await StorageNode.find().lean();
  const nodeMap = new Map();
  const codeToNodeMap = new Map();

  const getPathCodes = (node) => {
    const path = [];
    let current = node;
    while (current) {
      path.unshift(current.code);
      current = current.parentId ? nodeMap.get(String(current.parentId)) : null;
    }
    return path;
  };

  nodes.forEach(node => {
    nodeMap.set(String(node._id), node);
  });

  nodes.forEach(node => {
    node.displayId = generateLocationDisplayId(getPathCodes(node));
    if (node.displayId) {
      codeToNodeMap.set(node.displayId.toUpperCase(), node);
    }
    if (node.code) {
      codeToNodeMap.set(node.code.toUpperCase(), node);
    }
  });

  return { nodes, nodeMap, codeToNodeMap };
};

// @desc    Get Complete Inventory Report
// @route   GET /api/reports/inventory
// @access  Private (requireAuth)
exports.getInventoryReport = async (req, res) => {
  try {
    const { category, status, section, storageUnit, project } = req.query;

    const query = { isArchived: { $ne: true } };
    if (category && category !== 'All') {
      query.category = String(category).trim();
    }

    let items = await InventoryItem.find(query).populate(deepPopulateLocation).sort({ name: 1 });
    const { nodeMap } = await getStorageNodesMap();

    // Enrich items with resolved location display strings and associated projects
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const locList = (item.locations || []).map(loc => {
        const nodeDoc = loc.node;
        const displayCode = nodeDoc ? (nodeDoc.displayId || generateLocationDisplayId(
          (() => {
            const p = [];
            let curr = nodeDoc;
            while (curr) {
              p.unshift(curr.code);
              curr = curr.parentId ? (curr.parentId._id ? curr.parentId : nodeMap.get(String(curr.parentId))) : null;
            }
            return p;
          })()
        )) : 'Unassigned';

        return {
          nodeId: nodeDoc?._id || loc.node,
          displayId: displayCode,
          quantity: loc.quantity || 0
        };
      });

      // Find projects linked via InventoryUsage
      const usageRecords = await InventoryUsage.find({ item: item._id }).populate('project');
      const projectNames = Array.from(new Set(usageRecords.map(u => u.project?.name).filter(Boolean)));

      const minStock = item.minimumStock !== undefined ? item.minimumStock : (item.lowStockThreshold || 0);
      let stockStatus = 'In Stock';
      if (item.quantity === 0) stockStatus = 'Out of Stock';
      else if (item.quantity <= minStock) stockStatus = 'Low Stock';

      return {
        _id: item._id,
        name: item.name,
        category: item.category || 'Other',
        quantity: item.quantity,
        minimumStock: minStock,
        maximumStock: item.maximumStock || 0,
        stockStatus,
        locations: locList,
        locationDisplay: locList.map(l => `${l.displayId} (${l.quantity})`).join(', ') || 'Unassigned',
        projects: projectNames,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    }));

    // Filter by Section or Storage Unit if specified
    let filteredItems = enrichedItems;
    if (section && section !== 'All') {
      const secUpper = section.toUpperCase();
      filteredItems = filteredItems.filter(it => 
        it.locations.some(l => l.displayId.toUpperCase().startsWith(secUpper))
      );
    }

    if (storageUnit && storageUnit !== 'All') {
      const suUpper = storageUnit.toUpperCase();
      filteredItems = filteredItems.filter(it => 
        it.locations.some(l => l.displayId.toUpperCase().includes(suUpper))
      );
    }

    if (project && project !== 'All') {
      filteredItems = filteredItems.filter(it => it.projects.includes(project));
    }

    let totalQuantity = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    filteredItems.forEach(it => {
      totalQuantity += it.quantity;
      if (it.stockStatus === 'Low Stock') lowStockCount++;
      if (it.stockStatus === 'Out of Stock') outOfStockCount++;
    });

    res.status(200).json({
      success: true,
      count: filteredItems.length,
      summary: {
        totalItems: filteredItems.length,
        totalQuantity,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount
      },
      data: filteredItems
    });
  } catch (error) {
    console.error('Get Inventory Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate inventory report.' });
  }
};

// @desc    Get Storage Location Hierarchy Report
// @route   GET /api/reports/location
// @access  Private (requireAuth)
exports.getLocationReport = async (req, res) => {
  try {
    const { section, storageUnit } = req.query;
    const { nodes, nodeMap } = await getStorageNodesMap();
    const items = await InventoryItem.find({ isArchived: { $ne: true } }).lean();

    // Map item locations by nodeId
    const nodeItemsMap = new Map();
    items.forEach(item => {
      (item.locations || []).forEach(loc => {
        const nodeIdStr = String(loc.node);
        if (!nodeItemsMap.has(nodeIdStr)) nodeItemsMap.set(nodeIdStr, []);
        nodeItemsMap.get(nodeIdStr).push({
          itemId: item._id,
          name: item.name,
          category: item.category || 'Other',
          quantityAtLocation: loc.quantity || 0,
          totalQuantity: item.quantity
        });
      });
    });

    // Build hierarchical tree for Sections A and B
    const sections = ['A', 'B'].filter(sec => !section || section === 'All' || section.toUpperCase() === sec);

    const reportData = sections.map(secName => {
      const secNode = nodes.find(n => n.type === 'SECTION' && n.section === secName);
      if (!secNode) return null;

      const units = nodes.filter(n => n.type === 'STORAGE_UNIT' && String(n.parentId) === String(secNode._id))
        .filter(u => !storageUnit || storageUnit === 'All' || u.displayId.toUpperCase() === storageUnit.toUpperCase() || u.code === storageUnit);

      const unitTrees = units.map(unit => {
        const containers = nodes.filter(n => n.type === 'CONTAINER' && String(n.parentId) === String(unit._id));
        
        const containerTrees = containers.map(cnt => {
          const directItems = nodeItemsMap.get(String(cnt._id)) || [];
          
          // Sub-containers if any
          const subContainers = nodes.filter(n => n.type === 'CONTAINER' && String(n.parentId) === String(cnt._id));
          const subTrees = subContainers.map(sub => ({
            _id: sub._id,
            name: sub.name,
            code: sub.code,
            displayId: sub.displayId,
            items: nodeItemsMap.get(String(sub._id)) || []
          }));

          return {
            _id: cnt._id,
            name: cnt.name,
            code: cnt.code,
            displayId: cnt.displayId,
            items: directItems,
            containers: subTrees
          };
        });

        const unitDirectItems = nodeItemsMap.get(String(unit._id)) || [];

        return {
          _id: unit._id,
          name: unit.name,
          code: unit.code,
          displayId: unit.displayId,
          items: unitDirectItems,
          containers: containerTrees
        };
      });

      return {
        section: secName,
        name: `Section ${secName}`,
        units: unitTrees
      };
    }).filter(Boolean);

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Get Location Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate location report.' });
  }
};

// @desc    Get Low Stock Report
// @route   GET /api/reports/low-stock
// @access  Private (requireAuth)
exports.getLowStockReport = async (req, res) => {
  try {
    const { category, section } = req.query;

    const query = {
      isArchived: { $ne: true },
      quantity: { $gt: 0 }
    };

    if (category && category !== 'All') query.category = category;

    const allItems = await InventoryItem.find(query).populate(deepPopulateLocation).sort({ quantity: 1 });
    const items = allItems.filter(item => {
      const minStock = (item.minimumStock !== undefined && item.minimumStock > 0) ? item.minimumStock : (item.lowStockThreshold || 5);
      return item.quantity <= minStock;
    });

    const buyListEntries = await BuyListItem.find({ status: 'NEEDED' }).lean();
    const buyListNames = new Set(buyListEntries.map(b => b.name.trim().toLowerCase()));

    const enriched = items.map(item => {
      const isBuyList = buyListNames.has(item.name.trim().toLowerCase());
      const locDisplay = (item.locations || []).map(l => {
        return l.node ? (l.node.displayId || l.node.code || 'Unassigned') : 'Unassigned';
      }).join(', ') || 'Unassigned';

      return {
        _id: item._id,
        name: item.name,
        category: item.category || 'Other',
        quantity: item.quantity,
        minimumStock: item.minimumStock || item.lowStockThreshold || 5,
        maximumStock: item.maximumStock || 0,
        status: 'LOW STOCK',
        locationDisplay: locDisplay,
        buyListStatus: isBuyList ? 'Already on Buy List' : 'Not Added',
        onBuyList: isBuyList
      };
    });

    let result = enriched;
    if (section && section !== 'All') {
      result = result.filter(i => i.locationDisplay.toUpperCase().startsWith(section.toUpperCase()));
    }

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('Get Low Stock Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate low stock report.' });
  }
};

// @desc    Get Out Of Stock Report
// @route   GET /api/reports/out-of-stock
// @access  Private (requireAuth)
exports.getOutOfStockReport = async (req, res) => {
  try {
    const { category } = req.query;

    const query = {
      isArchived: { $ne: true },
      quantity: 0
    };

    if (category && category !== 'All') query.category = category;

    const items = await InventoryItem.find(query).populate(deepPopulateLocation).sort({ name: 1 });
    const buyListEntries = await BuyListItem.find({ status: 'NEEDED' }).lean();
    const buyListNames = new Set(buyListEntries.map(b => b.name.trim().toLowerCase()));

    const enriched = items.map(item => {
      const isBuyList = buyListNames.has(item.name.trim().toLowerCase());
      const locDisplay = (item.locations || []).map(l => {
        return l.node ? (l.node.displayId || l.node.code || 'Unassigned') : 'Unassigned';
      }).join(', ') || 'Unassigned';

      return {
        _id: item._id,
        name: item.name,
        category: item.category || 'Other',
        quantity: 0,
        minimumStock: item.minimumStock || item.lowStockThreshold || 5,
        status: 'OUT OF STOCK',
        locationDisplay: locDisplay,
        buyListStatus: isBuyList ? 'Already on Buy List' : 'Not Added',
        onBuyList: isBuyList
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    console.error('Get Out of Stock Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate out of stock report.' });
  }
};

// @desc    Get Stock Movement / History Report
// @route   GET /api/reports/movement
// @access  Private (requireAuth)
exports.getStockMovementReport = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, activityType } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (dateRange === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (dateRange === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      dateFilter = { createdAt: { $gte: d } };
    } else if (dateRange === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      dateFilter = { createdAt: { $gte: d } };
    } else if (dateRange === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: startOfMonth } };
    } else if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const usageQuery = { ...dateFilter };
    const stockInQuery = { ...dateFilter };
    const adjustQuery = { ...dateFilter };

    const [usageRecords, stockInRecords, adjustRecords] = await Promise.all([
      InventoryUsage.find(usageQuery).populate('item').populate('project').sort({ createdAt: -1 }),
      InventoryStockIn.find(stockInQuery).populate('item').sort({ createdAt: -1 }),
      InventoryAdjustment.find(adjustQuery).populate('item').sort({ createdAt: -1 })
    ]);

    const events = [];

    usageRecords.forEach(u => {
      events.push({
        _id: u._id,
        date: u.createdAt,
        type: 'Stock Out',
        itemName: u.item ? u.item.name : 'Unknown Item',
        category: u.item ? u.item.category : 'Other',
        quantity: -Math.abs(u.quantity),
        project: u.project ? u.project.name : (u.notes ? u.notes : '-'),
        location: u.location || 'N/A',
        notes: u.notes || ''
      });
    });

    stockInRecords.forEach(s => {
      events.push({
        _id: s._id,
        date: s.createdAt,
        type: 'Stock In',
        itemName: s.item ? s.item.name : 'Unknown Item',
        category: s.item ? s.item.category : 'Other',
        quantity: s.quantity,
        supplier: s.supplier || '-',
        notes: s.notes || ''
      });
    });

    adjustRecords.forEach(a => {
      const isMove = a.reason && a.reason.toLowerCase().includes('move');
      events.push({
        _id: a._id,
        date: a.createdAt,
        type: isMove ? 'Move' : 'Adjustment',
        itemName: a.item ? a.item.name : 'Unknown Item',
        category: a.item ? a.item.category : 'Other',
        quantity: a.difference,
        previousQuantity: a.previousQuantity,
        newQuantity: a.newQuantity,
        reason: a.reason || 'Stock Adjustment',
        notes: a.notes || ''
      });
    });

    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    let filteredEvents = events;
    if (activityType && activityType !== 'All') {
      filteredEvents = filteredEvents.filter(e => e.type.toLowerCase() === activityType.toLowerCase());
    }

    res.status(200).json({
      success: true,
      count: filteredEvents.length,
      data: filteredEvents
    });
  } catch (error) {
    console.error('Get Stock Movement Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate stock movement report.' });
  }
};

// @desc    Get Project Usage Report
// @route   GET /api/reports/project-usage
// @access  Private (requireAuth)
exports.getProjectUsageReport = async (req, res) => {
  try {
    const projects = await Project.find().sort({ name: 1 }).lean();
    
    const projectReports = await Promise.all(projects.map(async (proj) => {
      const usageRecords = await InventoryUsage.find({ project: proj._id }).populate('item').populate(deepPopulateLocation);

      const itemMap = new Map();
      let totalUnitsUsed = 0;

      usageRecords.forEach(rec => {
        if (!rec.item) return;
        const itemId = String(rec.item._id);
        const qty = Number(rec.quantity) || 0;
        totalUnitsUsed += qty;

        const locDisplay = (rec.item.locations || []).map(l => l.node ? (l.node.displayId || l.node.code) : 'Unassigned').join(', ') || 'Unassigned';

        if (itemMap.has(itemId)) {
          const existing = itemMap.get(itemId);
          existing.quantityUsed += qty;
        } else {
          itemMap.set(itemId, {
            itemId: rec.item._id,
            itemName: rec.item.name,
            category: rec.item.category || 'Other',
            quantityUsed: qty,
            availableStock: rec.item.quantity,
            locations: locDisplay
          });
        }
      });

      return {
        projectId: proj._id,
        projectName: proj.name,
        description: proj.description,
        status: proj.status,
        totalUnitsUsed,
        differentItemsCount: itemMap.size,
        items: Array.from(itemMap.values())
      };
    }));

    res.status(200).json({
      success: true,
      count: projectReports.length,
      data: projectReports
    });
  } catch (error) {
    console.error('Get Project Usage Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate project usage report.' });
  }
};

// @desc    Get Buy List Report
// @route   GET /api/reports/buy-list
// @access  Private (requireAuth)
exports.getBuyListReport = async (req, res) => {
  try {
    const buyListItems = await BuyListItem.find().sort({ status: 1, createdAt: -1 }).lean();
    const activeItems = await InventoryItem.find({ isArchived: { $ne: true } }).lean();

    const invMap = new Map();
    activeItems.forEach(i => invMap.set(i.name.trim().toLowerCase(), i));

    const enriched = buyListItems.map(item => {
      const invMatch = invMap.get(item.name.trim().toLowerCase());
      const currentQty = invMatch ? invMatch.quantity : 0;
      const minStock = invMatch ? (invMatch.minimumStock || invMatch.lowStockThreshold || 0) : 0;

      let stockStatus = 'Not in Stock';
      if (invMatch) {
        if (currentQty === 0) stockStatus = 'OUT OF STOCK';
        else if (currentQty <= minStock) stockStatus = 'LOW STOCK';
        else stockStatus = 'IN STOCK';
      }

      return {
        _id: item._id,
        name: item.name,
        quantityNeeded: item.quantityNeeded,
        status: item.status,
        note: item.note || '',
        createdAt: item.createdAt,
        inventoryStock: currentQty,
        stockStatus
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    console.error('Get Buy List Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate buy list report.' });
  }
};

// @desc    Export Report as CSV
// @route   GET /api/reports/export
// @access  Private (requireAuth)
exports.exportReport = async (req, res) => {
  try {
    const { type = 'inventory', category, status, section, storageUnit } = req.query;
    const nowStr = new Date().toISOString().slice(0, 10);

    if (type === 'inventory') {
      const items = await InventoryItem.find({ isArchived: { $ne: true } }).populate(deepPopulateLocation).sort({ name: 1 });
      
      const normalizedRows = [];
      items.forEach(item => {
        const minStock = item.minimumStock !== undefined ? item.minimumStock : (item.lowStockThreshold || 0);
        let stockStatus = 'In Stock';
        if (item.quantity === 0) stockStatus = 'Out of Stock';
        else if (item.quantity <= minStock) stockStatus = 'Low Stock';

        if (item.locations && item.locations.length > 0) {
          item.locations.forEach(loc => {
            normalizedRows.push({
              name: item.name,
              category: item.category || 'Other',
              totalQuantity: item.quantity,
              minimumStock: minStock,
              maximumStock: item.maximumStock || 0,
              status: stockStatus,
              locationId: loc.node ? (loc.node.displayId || loc.node.code || 'Unassigned') : 'Unassigned',
              locationQuantity: loc.quantity || 0,
              createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
              updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
            });
          });
        } else {
          normalizedRows.push({
            name: item.name,
            category: item.category || 'Other',
            totalQuantity: item.quantity,
            minimumStock: minStock,
            maximumStock: item.maximumStock || 0,
            status: stockStatus,
            locationId: 'Unassigned',
            locationQuantity: item.quantity,
            createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
            updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
          });
        }
      });

      const headers = [
        { label: 'Item Name', key: 'name' },
        { label: 'Category', key: 'category' },
        { label: 'Total Quantity', key: 'totalQuantity' },
        { label: 'Location ID', key: 'locationId' },
        { label: 'Location Quantity', key: 'locationQuantity' },
        { label: 'Minimum Stock', key: 'minimumStock' },
        { label: 'Maximum Stock', key: 'maximumStock' },
        { label: 'Stock Status', key: 'status' },
        { label: 'Created Date', key: 'createdAt' },
        { label: 'Updated Date', key: 'updatedAt' }
      ];

      const csvContent = generateCSVString(headers, normalizedRows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="inventory_report_${nowStr}.csv"`);
      return res.status(200).send(csvContent);
    }

    if (type === 'movement') {
      const usageRecords = await InventoryUsage.find().populate('item').populate('project').sort({ createdAt: -1 });
      const stockInRecords = await InventoryStockIn.find().populate('item').sort({ createdAt: -1 });
      const adjustRecords = await InventoryAdjustment.find().populate('item').sort({ createdAt: -1 });

      const events = [];
      usageRecords.forEach(u => events.push({
        date: new Date(u.createdAt).toLocaleString(),
        itemName: u.item ? u.item.name : 'Unknown',
        type: 'Stock Out',
        quantity: -Math.abs(u.quantity),
        project: u.project ? u.project.name : '-',
        notes: u.notes || ''
      }));

      stockInRecords.forEach(s => events.push({
        date: new Date(s.createdAt).toLocaleString(),
        itemName: s.item ? s.item.name : 'Unknown',
        type: 'Stock In',
        quantity: s.quantity,
        project: s.supplier || '-',
        notes: s.notes || ''
      }));

      adjustRecords.forEach(a => events.push({
        date: new Date(a.createdAt).toLocaleString(),
        itemName: a.item ? a.item.name : 'Unknown',
        type: a.reason && a.reason.toLowerCase().includes('move') ? 'Move' : 'Adjustment',
        quantity: a.difference,
        project: a.reason || 'Adjustment',
        notes: a.notes || ''
      }));

      events.sort((a, b) => new Date(b.date) - new Date(a.date));

      const headers = [
        { label: 'Date', key: 'date' },
        { label: 'Item Name', key: 'itemName' },
        { label: 'Event Type', key: 'type' },
        { label: 'Quantity', key: 'quantity' },
        { label: 'Project / Supplier', key: 'project' },
        { label: 'Notes', key: 'notes' }
      ];

      const csvContent = generateCSVString(headers, events);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="stock_movement_report_${nowStr}.csv"`);
      return res.status(200).send(csvContent);
    }

    res.status(400).json({ success: false, message: 'Invalid report export type specified.' });
  } catch (error) {
    console.error('Export Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to export report.' });
  }
};

// @desc    Preview CSV Import (Validate, check location hierarchy, detect duplicates)
// @route   POST /api/reports/import/preview
// @access  Private (requireAuth, requireRole('admin'))
exports.previewImportCsv = async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ success: false, message: 'CSV data string is required.' });
    }

    const rows = parseCSV(csvData);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid data rows found in CSV.' });
    }

    const { codeToNodeMap } = await getStorageNodesMap();
    const existingItems = await InventoryItem.find({ isArchived: { $ne: true } }).lean();
    const existingNameMap = new Map();
    existingItems.forEach(i => existingNameMap.set(i.name.trim().toLowerCase(), i));

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    const validatedRows = rows.map(row => {
      const rawName = row.itemname || row.item || row.name || row._raw['Item Name'] || row._raw['Item'] || '';
      const rawQty = row.quantity || row.qty || row._raw['Quantity'] || '0';
      const rawCategory = row.category || row._raw['Category'] || 'Other';
      const rawMinStock = row.minimumstock || row.minstock || row._raw['Minimum Stock'] || row._raw['Min Stock'] || '0';
      const rawMaxStock = row.maximumstock || row.maxstock || row._raw['Maximum Stock'] || row._raw['Max Stock'] || '0';
      const rawLocation = row.location || row.locationcode || row.locationid || row._raw['Location'] || row._raw['Location ID'] || '';

      const errors = [];
      const warnings = [];

      // 1. Name validation
      const name = String(rawName).trim();
      if (!name) {
        errors.push('Item name is required');
      } else if (name.length > 100) {
        errors.push('Item name cannot exceed 100 characters');
      }

      // 2. Quantity validation
      const qtyNum = Number(rawQty);
      if (isNaN(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 0) {
        errors.push(`Invalid quantity "${rawQty}": must be a non-negative integer`);
      }

      // 3. Min/Max stock validation
      const minStockNum = Number(rawMinStock);
      if (isNaN(minStockNum) || !Number.isInteger(minStockNum) || minStockNum < 0) {
        errors.push(`Invalid minimum stock "${rawMinStock}": must be a non-negative integer`);
      }

      const maxStockNum = Number(rawMaxStock);
      if (isNaN(maxStockNum) || !Number.isInteger(maxStockNum) || maxStockNum < 0) {
        errors.push(`Invalid maximum stock "${rawMaxStock}": must be a non-negative integer`);
      }

      if (maxStockNum > 0 && minStockNum > maxStockNum) {
        errors.push('Minimum stock cannot exceed maximum stock');
      }

      // 4. Location resolution validation
      let resolvedNode = null;
      const locStr = String(rawLocation).trim().toUpperCase();
      if (locStr) {
        resolvedNode = codeToNodeMap.get(locStr);
        if (!resolvedNode) {
          errors.push(`Invalid location reference "${rawLocation}": node does not exist in StorageNode hierarchy`);
        }
      } else {
        errors.push('Location reference is required');
      }

      // 5. Duplicate detection
      let existingMatch = null;
      if (name) {
        existingMatch = existingNameMap.get(name.toLowerCase());
        if (existingMatch) {
          warnings.push(`Possible duplicate item "${name}". Existing item has ${existingMatch.quantity} units.`);
        }
      }

      let status = 'valid';
      if (errors.length > 0) {
        status = 'error';
        errorCount++;
      } else if (warnings.length > 0) {
        status = 'warning';
        warningCount++;
      } else {
        validCount++;
      }

      return {
        rowNumber: row._rawLineNumber,
        status,
        data: {
          name,
          quantity: qtyNum,
          category: String(rawCategory).trim() || 'Other',
          minimumStock: minStockNum,
          maximumStock: maxStockNum,
          locationCode: locStr,
          locationId: resolvedNode ? String(resolvedNode._id) : null,
          locationDisplayId: resolvedNode ? resolvedNode.displayId : locStr
        },
        duplicateMatch: existingMatch ? {
          _id: existingMatch._id,
          name: existingMatch.name,
          currentQuantity: existingMatch.quantity
        } : null,
        duplicateAction: existingMatch ? 'update' : 'create',
        errors,
        warnings
      };
    });

    res.status(200).json({
      success: true,
      summary: {
        totalRows: validatedRows.length,
        validCount,
        warningCount,
        errorCount
      },
      rows: validatedRows
    });
  } catch (error) {
    console.error('Preview CSV Import Error:', error);
    res.status(500).json({ success: false, message: 'Failed to parse and validate CSV file.' });
  }
};

// @desc    Confirm & Commit CSV Import
// @route   POST /api/reports/import/confirm
// @access  Private (requireAuth, requireRole('admin'))
exports.confirmImportCsv = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No import rows provided for confirmation.' });
    }

    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    try {
      for (const row of rows) {
        if (row.status === 'error') {
          skippedCount++;
          continue;
        }

        const { name, quantity, category, minimumStock, maximumStock, locationId } = row.data;
        const duplicateAction = row.duplicateAction || 'create';

        if (duplicateAction === 'skip') {
          skippedCount++;
          continue;
        }

        if (duplicateAction === 'update' && row.duplicateMatch?._id) {
          const item = await InventoryItem.findById(row.duplicateMatch._id).session(session ? session : undefined);
          if (item) {
            item.quantity += quantity;
            if (category) item.category = category;
            if (minimumStock !== undefined) item.minimumStock = minimumStock;
            if (maximumStock !== undefined) item.maximumStock = maximumStock;
            
            // Add quantity to location node if location specified
            if (locationId && isValidId(locationId)) {
              const existingLoc = item.locations.find(l => String(l.node) === String(locationId));
              if (existingLoc) {
                existingLoc.quantity += quantity;
              } else {
                item.locations.push({ node: locationId, quantity });
              }
            }

            await item.save(session ? { session } : undefined);
            updatedCount++;
            continue;
          }
        }

        // Create new item
        if (!locationId || !isValidId(locationId)) {
          if (session) await session.abortTransaction();
          return res.status(400).json({ success: false, message: `Cannot import item "${name}": valid location ID is required.` });
        }

        const newItem = new InventoryItem({
          name,
          category: category || 'Other',
          quantity,
          locations: [{ node: locationId, quantity }],
          minimumStock: minimumStock || 0,
          lowStockThreshold: minimumStock || 5,
          maximumStock: maximumStock || 0
        });

        await newItem.save(session ? { session } : undefined);
        createdCount++;
      }

      if (session) await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: `Successfully processed import: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`,
        summary: {
          createdCount,
          updatedCount,
          skippedCount
        }
      });
    } catch (dbErr) {
      if (session) await session.abortTransaction();
      throw dbErr;
    } finally {
      if (session) session.endSession();
    }
  } catch (error) {
    console.error('Confirm CSV Import Error:', error);
    res.status(500).json({ success: false, message: 'Failed to commit import records to database.' });
  }
};
