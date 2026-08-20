const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const User = require('../models/User');
const StorageNode = require('../models/StorageNode');
const InventoryItem = require('../models/InventoryItem');
const Project = require('../models/Project');
const BuyListItem = require('../models/BuyListItem');
const InventoryUsage = require('../models/InventoryUsage');
const InventoryStockIn = require('../models/InventoryStockIn');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const auditService = require('./auditService');
const AUDIT_ACTIONS = require('../utils/auditActions');

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Helper to validate a hex 24-char ObjectId string
 */
const isValidObjectId = (id) => {
  if (!id) return false;
  const str = String(id);
  return /^[0-9a-fA-F]{24}$/.test(str);
};

/**
 * Format current date for backup filenames (e.g. inventory-backup-2026-08-20-0830)
 */
const getTimestampString = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  return `${year}-${month}-${day}-${hours}${mins}${secs}`;
};

/**
 * 1. Validate Backup Archive Structure & Integrity
 */
const validateBackup = (zipSource) => {
  const errors = [];
  const warnings = [];
  let zip;

  try {
    if (Buffer.isBuffer(zipSource)) {
      zip = new AdmZip(zipSource);
    } else if (typeof zipSource === 'string' && fs.existsSync(zipSource)) {
      zip = new AdmZip(zipSource);
    } else {
      return {
        isValid: false,
        errors: ['Invalid backup file source or file does not exist.'],
        warnings: [],
        manifest: null,
        collectionCounts: {}
      };
    }
  } catch (err) {
    return {
      isValid: false,
      errors: [`Failed to open archive: ${err.message}`],
      warnings: [],
      manifest: null,
      collectionCounts: {}
    };
  }

  // 1. Check Manifest
  const manifestEntry = zip.getEntry('backup-manifest.json');
  if (!manifestEntry) {
    errors.push('Archive missing required backup-manifest.json.');
    return { isValid: false, errors, warnings, manifest: null, collectionCounts: {} };
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
  } catch (e) {
    errors.push('backup-manifest.json contains invalid JSON syntax.');
    return { isValid: false, errors, warnings, manifest: null, collectionCounts: {} };
  }

  if (!manifest.backupVersion) {
    errors.push('Manifest missing required backupVersion field.');
  }

  // 2. Read Collection JSON Files
  const collectionsData = {};
  const requiredFiles = [
    { key: 'users', file: 'users.json' },
    { key: 'storageNodes', file: 'storage-nodes.json' },
    { key: 'inventoryItems', file: 'inventory.json' },
    { key: 'projects', file: 'projects.json' },
    { key: 'buyListItems', file: 'buy-list.json' },
    { key: 'inventoryUsages', file: 'usage.json' },
    { key: 'inventoryStockIns', file: 'stock-ins.json' },
    { key: 'inventoryAdjustments', file: 'adjustments.json' },
    { key: 'notifications', file: 'notifications.json' },
    { key: 'auditLogs', file: 'audit-logs.json' }
  ];

  for (const { key, file } of requiredFiles) {
    const entry = zip.getEntry(file);
    if (!entry) {
      errors.push(`Required collection file missing: ${file}`);
      continue;
    }
    try {
      const parsed = JSON.parse(entry.getData().toString('utf8'));
      if (!Array.isArray(parsed)) {
        errors.push(`File ${file} must contain a JSON array of records.`);
      } else {
        collectionsData[key] = parsed;
      }
    } catch (e) {
      errors.push(`File ${file} contains invalid JSON syntax.`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings, manifest, collectionCounts: manifest.collections || {} };
  }

  // 3. Perform Deep Relationship & Object ID Validation
  const nodeMap = new Map();
  const userSet = new Set();
  const itemSet = new Set();
  const projectSet = new Set();

  // Validate Storage Nodes
  (collectionsData.storageNodes || []).forEach((node, idx) => {
    if (!isValidObjectId(node._id)) {
      errors.push(`StorageNode at index ${idx} has invalid _id: ${node._id}`);
    } else {
      nodeMap.set(String(node._id), node);
    }
  });

  // Check StorageNode Parent-Child Integrity
  nodeMap.forEach((node, id) => {
    if (node.type === 'SECTION') {
      if (node.parentId) {
        errors.push(`StorageNode SECTION '${node.name}' (${id}) must not have a parentId.`);
      }
    } else if (node.type === 'STORAGE_UNIT') {
      if (!node.parentId) {
        errors.push(`StorageNode STORAGE_UNIT '${node.name}' (${id}) must have a parentId.`);
      } else {
        const parent = nodeMap.get(String(node.parentId));
        if (!parent) {
          errors.push(`StorageNode STORAGE_UNIT '${node.name}' (${id}) references missing parentId '${node.parentId}'.`);
        } else if (parent.type !== 'SECTION') {
          errors.push(`StorageNode STORAGE_UNIT '${node.name}' (${id}) parent must be a SECTION.`);
        }
      }
    } else if (node.type === 'CONTAINER') {
      if (!node.parentId) {
        errors.push(`StorageNode CONTAINER '${node.name}' (${id}) must have a parentId.`);
      } else {
        const parent = nodeMap.get(String(node.parentId));
        if (!parent) {
          errors.push(`StorageNode CONTAINER '${node.name}' (${id}) references missing parentId '${node.parentId}'.`);
        } else if (parent.type !== 'STORAGE_UNIT' && parent.type !== 'CONTAINER') {
          errors.push(`StorageNode CONTAINER '${node.name}' (${id}) parent must be a STORAGE_UNIT or CONTAINER.`);
        }
      }
    }

    // Circular parent check
    let curr = node;
    const visited = new Set([id]);
    while (curr && curr.parentId) {
      const pid = String(curr.parentId);
      if (visited.has(pid)) {
        errors.push(`Circular parent reference detected in StorageNode hierarchy at node '${curr.name}' (${curr._id}).`);
        break;
      }
      visited.add(pid);
      curr = nodeMap.get(pid);
    }
  });

  // Validate Users
  (collectionsData.users || []).forEach((u, idx) => {
    if (!isValidObjectId(u._id)) {
      errors.push(`User at index ${idx} has invalid _id: ${u._id}`);
    } else {
      userSet.add(String(u._id));
    }
  });

  // Validate Inventory Items & Location references
  (collectionsData.inventoryItems || []).forEach((item, idx) => {
    if (!isValidObjectId(item._id)) {
      errors.push(`InventoryItem at index ${idx} has invalid _id: ${item._id}`);
    } else {
      itemSet.add(String(item._id));
    }

    if (Array.isArray(item.locations)) {
      item.locations.forEach((loc, lIdx) => {
        const nodeId = loc.node?._id || loc.node;
        if (!nodeId || !nodeMap.has(String(nodeId))) {
          errors.push(`InventoryItem '${item.name}' (${item._id}) references non-existent StorageNode location '${nodeId}' at index ${lIdx}.`);
        }
      });
    }
  });

  // Validate Projects
  (collectionsData.projects || []).forEach((p, idx) => {
    if (!isValidObjectId(p._id)) {
      errors.push(`Project at index ${idx} has invalid _id: ${p._id}`);
    } else {
      projectSet.add(String(p._id));
    }
  });

  const collectionCounts = {
    users: collectionsData.users.length,
    storageNodes: collectionsData.storageNodes.length,
    inventoryItems: collectionsData.inventoryItems.length,
    projects: collectionsData.projects.length,
    buyListItems: collectionsData.buyListItems.length,
    inventoryUsages: collectionsData.inventoryUsages.length,
    inventoryStockIns: collectionsData.inventoryStockIns.length,
    inventoryAdjustments: collectionsData.inventoryAdjustments.length,
    notifications: collectionsData.notifications.length,
    auditLogs: collectionsData.auditLogs.length
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    manifest,
    collectionCounts
  };
};

/**
 * 2. Create System Backup
 */
const createBackup = async ({ user = null, isSafetyBackup = false } = {}) => {
  const timestamp = getTimestampString();
  const filename = isSafetyBackup
    ? `safety-backup-${timestamp}.zip`
    : `inventory-backup-${timestamp}.zip`;
  const filepath = path.join(BACKUP_DIR, filename);

  // Query all 10 collections
  const users = await User.find({}).select('+passwordHash').lean();
  const storageNodes = await StorageNode.find({}).lean();
  const inventoryItems = await InventoryItem.find({}).lean();
  const projects = await Project.find({}).lean();
  const buyListItems = await BuyListItem.find({}).lean();
  const inventoryUsages = await InventoryUsage.find({}).lean();
  const inventoryStockIns = await InventoryStockIn.find({}).lean();
  const inventoryAdjustments = await InventoryAdjustment.find({}).lean();
  const notifications = await Notification.find({}).lean();
  const auditLogs = await AuditLog.find({}).lean();

  const manifest = {
    backupVersion: 1,
    createdAt: new Date().toISOString(),
    createdBy: user ? `${user.name} (${user.email})` : 'System Admin',
    isSafetyBackup,
    collections: {
      users: users.length,
      storageNodes: storageNodes.length,
      inventoryItems: inventoryItems.length,
      projects: projects.length,
      buyListItems: buyListItems.length,
      inventoryUsages: inventoryUsages.length,
      inventoryStockIns: inventoryStockIns.length,
      inventoryAdjustments: inventoryAdjustments.length,
      notifications: notifications.length,
      auditLogs: auditLogs.length
    }
  };

  const zip = new AdmZip();
  zip.addFile('backup-manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
  zip.addFile('users.json', Buffer.from(JSON.stringify(users, null, 2), 'utf8'));
  zip.addFile('storage-nodes.json', Buffer.from(JSON.stringify(storageNodes, null, 2), 'utf8'));
  zip.addFile('inventory.json', Buffer.from(JSON.stringify(inventoryItems, null, 2), 'utf8'));
  zip.addFile('projects.json', Buffer.from(JSON.stringify(projects, null, 2), 'utf8'));
  zip.addFile('buy-list.json', Buffer.from(JSON.stringify(buyListItems, null, 2), 'utf8'));
  zip.addFile('usage.json', Buffer.from(JSON.stringify(inventoryUsages, null, 2), 'utf8'));
  zip.addFile('stock-ins.json', Buffer.from(JSON.stringify(inventoryStockIns, null, 2), 'utf8'));
  zip.addFile('adjustments.json', Buffer.from(JSON.stringify(inventoryAdjustments, null, 2), 'utf8'));
  zip.addFile('notifications.json', Buffer.from(JSON.stringify(notifications, null, 2), 'utf8'));
  zip.addFile('audit-logs.json', Buffer.from(JSON.stringify(auditLogs, null, 2), 'utf8'));

  zip.writeZip(filepath);

  // Validate archive
  const validation = validateBackup(filepath);
  if (!validation.isValid) {
    fs.unlinkSync(filepath);
    throw new Error(`Backup creation failed validation: ${validation.errors.join('; ')}`);
  }

  const stats = fs.statSync(filepath);

  // Log Audit Event
  const auditAction = isSafetyBackup ? AUDIT_ACTIONS.BACKUP_SAFETY_CREATED : AUDIT_ACTIONS.BACKUP_CREATE;
  await auditService.log({
    user,
    action: auditAction,
    resourceType: 'System',
    resourceName: filename,
    description: isSafetyBackup
      ? `Pre-restore safety backup created successfully (${(stats.size / 1024).toFixed(1)} KB)`
      : `Full system backup created successfully (${(stats.size / 1024).toFixed(1)} KB)`,
    metadata: {
      filename,
      sizeBytes: stats.size,
      counts: manifest.collections
    }
  });

  return {
    filename,
    filepath,
    sizeBytes: stats.size,
    createdAt: manifest.createdAt,
    createdBy: manifest.createdBy,
    isSafetyBackup,
    counts: manifest.collections
  };
};

/**
 * 3. List Available Backups
 */
const listBackups = () => {
  const files = fs.readdirSync(BACKUP_DIR);
  const backups = [];

  for (const file of files) {
    if (!file.endsWith('.zip')) continue;
    const fullPath = path.join(BACKUP_DIR, file);
    try {
      const stats = fs.statSync(fullPath);
      const zip = new AdmZip(fullPath);
      const manifestEntry = zip.getEntry('backup-manifest.json');
      let manifest = null;
      if (manifestEntry) {
        manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
      }
      backups.push({
        filename: file,
        sizeBytes: stats.size,
        sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
        createdAt: manifest?.createdAt || stats.mtime.toISOString(),
        createdBy: manifest?.createdBy || 'Unknown',
        isSafetyBackup: !!manifest?.isSafetyBackup,
        backupVersion: manifest?.backupVersion || 1,
        counts: manifest?.collections || {},
        status: 'VALID'
      });
    } catch (e) {
      backups.push({
        filename: file,
        sizeBytes: 0,
        sizeFormatted: '0 KB',
        createdAt: new Date().toISOString(),
        createdBy: 'Unknown',
        isSafetyBackup: false,
        backupVersion: 1,
        counts: {},
        status: 'CORRUPTED'
      });
    }
  }

  // Sort descending by creation date
  backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return backups;
};

/**
 * Helper to parse a zip file buffer or path into collections JSON maps
 */
const extractZipData = (zipSource) => {
  const zip = Buffer.isBuffer(zipSource) ? new AdmZip(zipSource) : new AdmZip(zipSource);
  const manifest = JSON.parse(zip.getEntry('backup-manifest.json').getData().toString('utf8'));

  const getCollection = (filename) => {
    const entry = zip.getEntry(filename);
    if (!entry) return [];
    return JSON.parse(entry.getData().toString('utf8'));
  };

  return {
    manifest,
    users: getCollection('users.json'),
    storageNodes: getCollection('storage-nodes.json'),
    inventoryItems: getCollection('inventory.json'),
    projects: getCollection('projects.json'),
    buyListItems: getCollection('buy-list.json'),
    inventoryUsages: getCollection('usage.json'),
    inventoryStockIns: getCollection('stock-ins.json'),
    inventoryAdjustments: getCollection('adjustments.json'),
    notifications: getCollection('notifications.json'),
    auditLogs: getCollection('audit-logs.json')
  };
};

/**
 * 4. Perform Safe Restoration with Rollback
 */
const restoreBackup = async (zipSource, user = null) => {
  // Step 1: Validate Backup
  const validation = validateBackup(zipSource);
  if (!validation.isValid) {
    throw new Error(`Backup validation failed: ${validation.errors.join('; ')}`);
  }

  // Step 2: Create Pre-restore Safety Backup
  let safetyBackupMeta = null;
  try {
    safetyBackupMeta = await createBackup({ user, isSafetyBackup: true });
  } catch (err) {
    throw new Error(`Restore aborted: Failed to create pre-restore safety backup (${err.message}). Live database was NOT modified.`);
  }

  // Step 3: Log Start
  await auditService.log({
    user,
    action: AUDIT_ACTIONS.BACKUP_RESTORE_START,
    resourceType: 'System',
    resourceName: 'Database Restoration',
    description: `Initiated restore from backup archive (Safety Backup created: ${safetyBackupMeta.filename})`,
    metadata: {
      safetyBackup: safetyBackupMeta.filename,
      targetCounts: validation.collectionCounts
    }
  });

  const backupData = extractZipData(zipSource);

  // Internal restore routine
  const executeRestoration = async (data) => {
    // Dependency-aware restoration order:
    // 1. Users
    await User.deleteMany({});
    if (data.users.length > 0) {
      await User.insertMany(data.users);
    }

    // 2. StorageNodes (Insert in topological order: SECTION -> STORAGE_UNIT -> CONTAINER)
    await StorageNode.deleteMany({});
    if (data.storageNodes.length > 0) {
      const sections = data.storageNodes.filter(n => n.type === 'SECTION');
      const units = data.storageNodes.filter(n => n.type === 'STORAGE_UNIT');
      const containers = data.storageNodes.filter(n => n.type === 'CONTAINER');

      if (sections.length > 0) await StorageNode.insertMany(sections, { validateBeforeSave: false });
      if (units.length > 0) await StorageNode.insertMany(units, { validateBeforeSave: false });
      if (containers.length > 0) await StorageNode.insertMany(containers, { validateBeforeSave: false });
    }

    // 3. InventoryItems
    await InventoryItem.deleteMany({});
    if (data.inventoryItems.length > 0) {
      await InventoryItem.insertMany(data.inventoryItems, { validateBeforeSave: false });
    }

    // 4. Projects
    await Project.deleteMany({});
    if (data.projects.length > 0) {
      await Project.insertMany(data.projects);
    }

    // 5. BuyListItems
    await BuyListItem.deleteMany({});
    if (data.buyListItems.length > 0) {
      await BuyListItem.insertMany(data.buyListItems);
    }

    // 6. InventoryUsages
    await InventoryUsage.deleteMany({});
    if (data.inventoryUsages.length > 0) {
      await InventoryUsage.insertMany(data.inventoryUsages);
    }

    // 7. InventoryStockIns
    await InventoryStockIn.deleteMany({});
    if (data.inventoryStockIns.length > 0) {
      await InventoryStockIn.insertMany(data.inventoryStockIns);
    }

    // 8. InventoryAdjustments
    await InventoryAdjustment.deleteMany({});
    if (data.inventoryAdjustments.length > 0) {
      await InventoryAdjustment.insertMany(data.inventoryAdjustments);
    }

    // 9. Notifications
    await Notification.deleteMany({});
    if (data.notifications.length > 0) {
      await Notification.insertMany(data.notifications);
    }

    // 10. AuditLogs
    await AuditLog.deleteMany({});
    if (data.auditLogs.length > 0) {
      await AuditLog.insertMany(data.auditLogs);
    }
  };

  try {
    await executeRestoration(backupData);

    // Post-restore verification
    const verifiedCounts = {
      users: await User.countDocuments(),
      storageNodes: await StorageNode.countDocuments(),
      inventoryItems: await InventoryItem.countDocuments(),
      projects: await Project.countDocuments(),
      buyListItems: await BuyListItem.countDocuments(),
      inventoryUsages: await InventoryUsage.countDocuments(),
      inventoryStockIns: await InventoryStockIn.countDocuments(),
      inventoryAdjustments: await InventoryAdjustment.countDocuments(),
      notifications: await Notification.countDocuments(),
      auditLogs: await AuditLog.countDocuments()
    };

    // Log Restore Success
    await auditService.log({
      user,
      action: AUDIT_ACTIONS.BACKUP_RESTORE_SUCCESS,
      resourceType: 'System',
      resourceName: 'Database Restoration',
      description: 'System database restored successfully and verified.',
      metadata: {
        safetyBackup: safetyBackupMeta.filename,
        verifiedCounts
      }
    });

    return {
      success: true,
      verifiedCounts,
      safetyBackup: safetyBackupMeta.filename
    };
  } catch (restoreErr) {
    console.error('RESTORE FAILED. Initiating automatic rollback using safety backup:', restoreErr);

    // Log Restore Failure
    await auditService.log({
      user,
      action: AUDIT_ACTIONS.BACKUP_RESTORE_FAILED,
      resourceType: 'System',
      resourceName: 'Database Restoration',
      description: `Restore failed: ${restoreErr.message}. Initiating rollback to safety backup.`,
      metadata: {
        error: restoreErr.message,
        safetyBackup: safetyBackupMeta.filename
      }
    });

    // ROLLBACK using safety backup
    try {
      const safetyData = extractZipData(safetyBackupMeta.filepath);
      await executeRestoration(safetyData);
      console.log('ROLLBACK SUCCESSFUL. Database restored to pre-restore state.');
    } catch (rollbackErr) {
      console.error('FATAL: ROLLBACK FAILED:', rollbackErr);
      throw new Error(`CRITICAL: Restoration failed (${restoreErr.message}) and automatic rollback failed (${rollbackErr.message}). Safety backup saved at: ${safetyBackupMeta.filepath}`);
    }

    throw new Error(`Restoration failed: ${restoreErr.message}. Automatic rollback successfully restored original database state from safety backup (${safetyBackupMeta.filename}).`);
  }
};

/**
 * Get Filepath of a backup by filename safely
 */
const getBackupFilePath = (filename) => {
  const safeFilename = path.basename(filename);
  const filepath = path.join(BACKUP_DIR, safeFilename);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  return filepath;
};

module.exports = {
  BACKUP_DIR,
  validateBackup,
  createBackup,
  listBackups,
  restoreBackup,
  getBackupFilePath
};
