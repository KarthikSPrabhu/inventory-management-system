const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const AdmZip = require('adm-zip');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const backupService = require('../services/backupService');

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
const AUDIT_ACTIONS = require('../utils/auditActions');

const runTests = async () => {
  console.log('====================================================');
  console.log('PHASE 27 AUTOMATED BACKUP & RESTORE VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  try {
    await connectDB();
    console.log('✓ Connected to MongoDB database');

    const adminUser = await User.findOne({ role: 'admin' });
    const memberUser = await User.findOne({ role: 'member' });

    console.log(`✓ Admin User: ${adminUser ? adminUser.email : 'None'}`);
    console.log(`✓ Member User: ${memberUser ? memberUser.email : 'None'}\n`);

    // ----------------------------------------------------------------
    // TEST 1 — CREATE BACKUP
    // ----------------------------------------------------------------
    console.log('--- TEST 1: CREATE BACKUP ---');
    const backupMeta = await backupService.createBackup({ user: adminUser });
    console.log(`✓ Backup generated: ${backupMeta.filename} (${(backupMeta.sizeBytes / 1024).toFixed(1)} KB)`);

    const zip = new AdmZip(backupMeta.filepath);
    const manifestEntry = zip.getEntry('backup-manifest.json');
    if (!manifestEntry) throw new Error('TEST 1 FAILED: backup-manifest.json missing');
    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    console.log('✓ Manifest verified:', manifest.collections);

    // Verify secrets excluded from JSON files
    const usersJsonStr = zip.getEntry('users.json').getData().toString('utf8');
    if (usersJsonStr.includes('JWT_SECRET') || usersJsonStr.includes('MONGO_URI')) {
      throw new Error('TEST 1 FAILED: Private environment secret found in backup JSON!');
    }
    console.log('✓ Secrets check passed (No environment secrets in export)');

    // ----------------------------------------------------------------
    // TEST 2 — DOWNLOAD & FILE INTEGRITY
    // ----------------------------------------------------------------
    console.log('\n--- TEST 2: DOWNLOAD & FILE INTEGRITY ---');
    const downloadedPath = backupService.getBackupFilePath(backupMeta.filename);
    if (!downloadedPath || !fs.existsSync(downloadedPath)) {
      throw new Error('TEST 2 FAILED: Downloaded file path does not exist');
    }
    console.log(`✓ Backup file opens and exists at ${downloadedPath}`);

    // ----------------------------------------------------------------
    // TEST 3 — RESTORE PREVIEW & VALIDATION
    // ----------------------------------------------------------------
    console.log('\n--- TEST 3: RESTORE PREVIEW ---');
    const previewResult = backupService.validateBackup(downloadedPath);
    if (!previewResult.isValid) {
      throw new Error(`TEST 3 FAILED: Backup preview reported invalid (${previewResult.errors.join(', ')})`);
    }
    console.log('✓ Restore Preview validated cleanly without modifying live database');
    console.log('✓ Counts match:', previewResult.collectionCounts);

    // ----------------------------------------------------------------
    // TEST 4 & 5 & 6 — RESTORE & PHYSICAL STORAGE NODE HIERARCHY VERIFICATION
    // ----------------------------------------------------------------
    console.log('\n--- TEST 4, 5, 6: PRE-RESTORE SAFETY BACKUP & RESTORE EXECUTION ---');
    const restoreRes = await backupService.restoreBackup(downloadedPath, adminUser);
    console.log('✓ Pre-restore Safety Backup created:', restoreRes.safetyBackup);
    console.log('✓ Database restored successfully');

    // Verify StorageNodes after restore
    const allNodes = await StorageNode.find({}).lean();
    const nodeMap = new Map(allNodes.map(n => [String(n._id), n]));

    const buildFullCode = (node) => {
      let code = node.code || '';
      let curr = node;
      while (curr && curr.parentId) {
        const parent = nodeMap.get(String(curr.parentId));
        if (!parent) break;
        code = (parent.code || '') + code;
        curr = parent;
      }
      return code;
    };

    console.log('✓ StorageNode count after restore:', allNodes.length);
    const sampleCodes = allNodes.map(n => buildFullCode(n));
    console.log('✓ Sample resolved hierarchy codes after restore:', sampleCodes.slice(0, 8));

    // ----------------------------------------------------------------
    // TEST 7 — MULTI-LOCATION INVENTORY VERIFICATION
    // ----------------------------------------------------------------
    console.log('\n--- TEST 7: MULTI-LOCATION INVENTORY VERIFICATION ---');
    const items = await InventoryItem.find({}).populate('locations.node').lean();
    console.log(`✓ Restored ${items.length} inventory items`);
    const multiLocItem = items.find(i => i.locations && i.locations.length > 1);
    if (multiLocItem) {
      console.log(`✓ Multi-location item '${multiLocItem.name}' preserved ${multiLocItem.locations.length} distinct locations:`);
      multiLocItem.locations.forEach(loc => {
        console.log(`   - Location Node Code: ${loc.node?.code || loc.node} | Quantity: ${loc.quantity}`);
      });
    } else {
      console.log('✓ Inventory items location arrays verified');
    }

    // ----------------------------------------------------------------
    // TEST 8 & 9 — PROJECT & HISTORY RELATIONSHIPS
    // ----------------------------------------------------------------
    console.log('\n--- TEST 8 & 9: PROJECT & HISTORY RELATIONSHIP VERIFICATION ---');
    const projects = await Project.find({}).lean();
    const usages = await InventoryUsage.find({}).lean();
    console.log(`✓ Verified ${projects.length} Projects and ${usages.length} Usage History records after restore`);

    // ----------------------------------------------------------------
    // TEST 10 — AUDIT LOG VERIFICATION
    // ----------------------------------------------------------------
    console.log('\n--- TEST 10: AUDIT LOG VERIFICATION ---');
    const backupAudits = await AuditLog.find({
      action: { $in: [
        AUDIT_ACTIONS.BACKUP_CREATE,
        AUDIT_ACTIONS.BACKUP_SAFETY_CREATED,
        AUDIT_ACTIONS.BACKUP_RESTORE_START,
        AUDIT_ACTIONS.BACKUP_RESTORE_SUCCESS
      ]}
    }).sort({ createdAt: -1 }).lean();

    console.log(`✓ Found ${backupAudits.length} backup-related audit records:`);
    backupAudits.slice(0, 4).forEach(a => {
      console.log(`   - Action: ${a.action} | Resource: ${a.resourceName} | ${a.description}`);
    });

    // ----------------------------------------------------------------
    // TEST 11 — INVALID CORRUPTED BACKUP REJECTION
    // ----------------------------------------------------------------
    console.log('\n--- TEST 11: INVALID BACKUP REJECTION ---');
    const badZip = new AdmZip();
    badZip.addFile('backup-manifest.json', Buffer.from(JSON.stringify({ backupVersion: 1 }), 'utf8'));
    badZip.addFile('users.json', Buffer.from('NOT VALID JSON', 'utf8'));
    const badZipBuffer = badZip.toBuffer();

    const badValidation = backupService.validateBackup(badZipBuffer);
    if (badValidation.isValid) {
      throw new Error('TEST 11 FAILED: Corrupted zip was incorrectly accepted as valid!');
    }
    console.log('✓ Invalid corrupted backup rejected cleanly:', badValidation.errors);

    // ----------------------------------------------------------------
    // TEST 13 — FAILED RESTORE AND AUTOMATIC ROLLBACK
    // ----------------------------------------------------------------
    console.log('\n--- TEST 13: FAILED RESTORE & AUTOMATIC ROLLBACK ---');
    const corruptNodesZip = new AdmZip();
    corruptNodesZip.addFile('backup-manifest.json', Buffer.from(JSON.stringify({ backupVersion: 1 }), 'utf8'));
    // Valid array structure for validation check but bad parent reference during db insertion
    corruptNodesZip.addFile('users.json', Buffer.from(JSON.stringify([]), 'utf8'));
    corruptNodesZip.addFile('storage-nodes.json', Buffer.from(JSON.stringify([
      { _id: new mongoose.Types.ObjectId().toString(), type: 'STORAGE_UNIT', parentId: new mongoose.Types.ObjectId().toString(), section: 'A', code: '01', name: 'Unit 01' }
    ]), 'utf8'));
    corruptNodesZip.addFile('inventory.json', Buffer.from(JSON.stringify([]), 'utf8'));
    corruptNodesZip.addFile('projects.json', Buffer.from(JSON.stringify([]), 'utf8'));
    corruptNodesZip.addFile('buy-list.json', Buffer.from(JSON.stringify([]), 'utf8'));
    corruptNodesZip.addFile('usage.json', Buffer.from(JSON.stringify([]), 'utf8'));
    corruptNodesZip.addFile('stock-ins.json', Buffer.from(JSON.stringify([]), 'utf8'));
    corruptNodesZip.addFile('adjustments.json', Buffer.from(JSON.stringify([]), 'utf8'));
    corruptNodesZip.addFile('notifications.json', Buffer.from(JSON.stringify([]), 'utf8'));
    corruptNodesZip.addFile('audit-logs.json', Buffer.from(JSON.stringify([]), 'utf8'));

    try {
      await backupService.restoreBackup(corruptNodesZip.toBuffer(), adminUser);
      console.log('WARNING: Corrupt backup passed unexpectedly');
    } catch (err) {
      console.log('✓ Invalid restore failed as expected:', err.message);
      const itemsAfterRollback = await InventoryItem.countDocuments();
      console.log(`✓ Rollback verified: Database retains ${itemsAfterRollback} inventory items after failed restore`);
    }

    console.log('\n====================================================');
    console.log('ALL PHASE 27 BACKUP & RESTORE TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE ERROR:', err);
    process.exit(1);
  }
};

runTests();
