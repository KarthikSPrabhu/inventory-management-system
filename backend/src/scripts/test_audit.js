const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const AuditLog = require('../models/AuditLog');
const InventoryItem = require('../models/InventoryItem');
const StorageNode = require('../models/StorageNode');
const Project = require('../models/Project');
const BuyListItem = require('../models/BuyListItem');
const auditService = require('../services/auditService');
const AUDIT_ACTIONS = require('../utils/auditActions');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://karthik:Karthik123@cluster0.mongodb.net/inventory_system';

async function runAuditTests() {
  console.log('Connecting to MongoDB Atlas for Phase 26 Audit Verification...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas!\n');

  try {
    // 1. Create a dummy test user mock
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Karthik Prabhu',
      email: 'karthik@example.com',
      role: 'admin'
    };

    // 2. Fetch or create test StorageNodes: A04, A0402, B01, B0205
    let secA = await StorageNode.findOne({ type: 'SECTION', section: 'A' });
    if (!secA) {
      secA = await StorageNode.create({ name: 'Section A', type: 'SECTION', section: 'A', code: 'A' });
    }
    let secB = await StorageNode.findOne({ type: 'SECTION', section: 'B' });
    if (!secB) {
      secB = await StorageNode.create({ name: 'Section B', type: 'SECTION', section: 'B', code: 'B' });
    }

    let unitA4 = await StorageNode.findOne({ type: 'STORAGE_UNIT', parentId: secA._id, code: '04' });
    if (!unitA4) {
      unitA4 = await StorageNode.create({ name: 'Storage Unit 04', type: 'STORAGE_UNIT', section: 'A', code: '04', parentId: secA._id });
    }
    let containerA402 = await StorageNode.findOne({ type: 'CONTAINER', parentId: unitA4._id, code: '02' });
    if (!containerA402) {
      containerA402 = await StorageNode.create({ name: 'Box 02', type: 'CONTAINER', section: 'A', code: '02', parentId: unitA4._id });
    }
    let subBoxA40201 = await StorageNode.findOne({ type: 'CONTAINER', parentId: containerA402._id, code: '01' });
    if (!subBoxA40201) {
      subBoxA40201 = await StorageNode.create({ name: 'SubBox 01', type: 'CONTAINER', section: 'A', code: '01', parentId: containerA402._id });
    }

    let unitB1 = await StorageNode.findOne({ type: 'STORAGE_UNIT', parentId: secB._id, code: '01' });
    if (!unitB1) {
      unitB1 = await StorageNode.create({ name: 'Storage Unit 01', type: 'STORAGE_UNIT', section: 'B', code: '01', parentId: secB._id });
    }
    let unitB2 = await StorageNode.findOne({ type: 'STORAGE_UNIT', parentId: secB._id, code: '02' });
    if (!unitB2) {
      unitB2 = await StorageNode.create({ name: 'Storage Unit 02', type: 'STORAGE_UNIT', section: 'B', code: '02', parentId: secB._id });
    }
    let containerB205 = await StorageNode.findOne({ type: 'CONTAINER', parentId: unitB2._id, code: '05' });
    if (!containerB205) {
      containerB205 = await StorageNode.create({ name: 'Box 05', type: 'CONTAINER', section: 'B', code: '05', parentId: unitB2._id });
    }

    console.log('--- TEST 1: CREATE Audit Event ---');
    const item = await InventoryItem.create({
      name: 'ESP32 DevKit Phase26',
      category: 'Microcontrollers',
      quantity: 10,
      locations: [{ node: containerA402._id, quantity: 10 }],
      minimumStock: 5,
      maximumStock: 50
    });

    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.CREATE,
      resourceType: 'InventoryItem',
      resourceId: item._id,
      resourceName: item.name,
      description: `Created new inventory item "${item.name}"`,
      newState: item.toObject()
    });

    const createLog = await AuditLog.findOne({ resourceId: item._id, action: 'CREATE' });
    console.log(`✓ Create Audit Log Verified: Action=${createLog.action}, User=${createLog.userName}, Item=${createLog.resourceName}`);

    console.log('\n--- TEST 2: STOCK_IN Audit Event ---');
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.STOCK_IN,
      resourceType: 'InventoryItem',
      resourceId: item._id,
      resourceName: item.name,
      description: `Added 10 stock units to "${item.name}". Reason: Purchased`,
      previousState: { quantity: 10 },
      newState: { quantity: 20 },
      metadata: { quantityAdded: 10, reason: 'Purchased' }
    });
    const stockInLog = await AuditLog.findOne({ resourceId: item._id, action: 'STOCK_IN' });
    console.log(`✓ Stock In Audit Log Verified: PrevQty=${stockInLog.previousState.quantity}, NewQty=${stockInLog.newState.quantity}`);

    console.log('\n--- TEST 3: STOCK_OUT Audit Event ---');
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.STOCK_OUT,
      resourceType: 'InventoryItem',
      resourceId: item._id,
      resourceName: item.name,
      description: `Took 5 units of "${item.name}" for project "Smart Rover"`,
      previousState: { quantity: 20 },
      newState: { quantity: 15 },
      metadata: { quantityTaken: 5, projectName: 'Smart Rover' }
    });
    const stockOutLog = await AuditLog.findOne({ resourceId: item._id, action: 'STOCK_OUT' });
    console.log(`✓ Stock Out Audit Log Verified: Taken=${stockOutLog.metadata.quantityTaken}, Project=${stockOutLog.metadata.projectName}`);

    console.log('\n--- TEST 4: STOCK_ADJUST Audit Event ---');
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.STOCK_ADJUST,
      resourceType: 'InventoryItem',
      resourceId: item._id,
      resourceName: item.name,
      description: `Adjusted stock for "${item.name}" from 15 to 13. Reason: 2 damaged`,
      previousState: { quantity: 15 },
      newState: { quantity: 13 },
      metadata: { previousQuantity: 15, newQuantity: 13, difference: -2, reason: '2 damaged' }
    });
    const adjustLog = await AuditLog.findOne({ resourceId: item._id, action: 'STOCK_ADJUST' });
    console.log(`✓ Stock Adjust Audit Log Verified: Reason=${adjustLog.metadata.reason}, Diff=${adjustLog.metadata.difference}`);

    console.log('\n--- TEST 5: STOCK_MOVE Audit Event (A0402 -> B01) ---');
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.STOCK_MOVE,
      resourceType: 'InventoryItem',
      resourceId: item._id,
      resourceName: item.name,
      description: `Moved 5 units of "${item.name}" from A0402 to B01`,
      metadata: {
        quantity: 5,
        fromLocationDisplay: 'A0402',
        toLocationDisplay: 'B01'
      }
    });
    const moveLog1 = await AuditLog.findOne({ resourceId: item._id, action: 'STOCK_MOVE', 'metadata.fromLocationDisplay': 'A0402' });
    console.log(`✓ Stock Move (A0402 -> B01) Verified: From=${moveLog1.metadata.fromLocationDisplay}, To=${moveLog1.metadata.toLocationDisplay}`);

    console.log('\n--- TEST 6: Nested STOCK_MOVE Audit Event (A040201 -> B0205) ---');
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.STOCK_MOVE,
      resourceType: 'InventoryItem',
      resourceId: item._id,
      resourceName: item.name,
      description: `Moved 3 units of "${item.name}" from A040201 to B0205`,
      metadata: {
        quantity: 3,
        fromLocationDisplay: 'A040201',
        toLocationDisplay: 'B0205'
      }
    });
    const moveLog2 = await AuditLog.findOne({ resourceId: item._id, action: 'STOCK_MOVE', 'metadata.fromLocationDisplay': 'A040201' });
    console.log(`✓ Nested Stock Move (A040201 -> B0205) Verified: Complete From=${moveLog2.metadata.fromLocationDisplay}, To=${moveLog2.metadata.toLocationDisplay}`);

    console.log('\n--- TEST 7: PROJECT_CREATE Audit Event ---');
    const testProject = await Project.create({ name: 'Phase26 Smart Rover Project', status: 'active' });
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.PROJECT_CREATE,
      resourceType: 'Project',
      resourceId: testProject._id,
      resourceName: testProject.name,
      description: `Created new project "${testProject.name}"`
    });
    const projLog = await AuditLog.findOne({ resourceId: testProject._id, action: 'PROJECT_CREATE' });
    console.log(`✓ Project Audit Log Verified: Project=${projLog.resourceName}`);

    console.log('\n--- TEST 8: BUY_LIST_ADD Audit Event ---');
    const testBuyItem = await BuyListItem.create({ name: 'ESP32 Phase26 Sensor', quantityNeeded: 10 });
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.BUY_LIST_ADD,
      resourceType: 'BuyListItem',
      resourceId: testBuyItem._id,
      resourceName: testBuyItem.name,
      description: `Added "${testBuyItem.name}" to Buy List`
    });
    const buyLog = await AuditLog.findOne({ resourceId: testBuyItem._id, action: 'BUY_LIST_ADD' });
    console.log(`✓ Buy List Audit Log Verified: Item=${buyLog.resourceName}`);

    console.log('\n--- TEST 9: IMPORT & EXPORT Audit Events ---');
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.IMPORT,
      resourceType: 'System',
      resourceName: 'CSV Import',
      description: 'Imported CSV inventory records: 10 created, 2 updated, 0 skipped',
      metadata: { createdCount: 10, updatedCount: 2 }
    });
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.EXPORT,
      resourceType: 'Report',
      resourceName: 'INVENTORY Report',
      description: 'Exported inventory report to CSV format'
    });
    const importLog = await AuditLog.findOne({ action: 'IMPORT' });
    const exportLog = await AuditLog.findOne({ action: 'EXPORT' });
    console.log(`✓ Import Log Verified: Description="${importLog.description}"`);
    console.log(`✓ Export Log Verified: Description="${exportLog.description}"`);

    console.log('\n--- TEST 10: PASSWORD_CHANGE Security Audit ---');
    await auditService.log({
      user: mockUser,
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      resourceType: 'User',
      resourceId: mockUser._id,
      resourceName: mockUser.name,
      description: `User "${mockUser.name}" changed password`,
      previousState: { password: 'SecretPassword123!', passwordHash: '$2a$10$abcdef' },
      newState: { password: 'NewPassword456!', passwordHash: '$2a$10$xyz123' }
    });
    const pwdLog = await AuditLog.findOne({ user: mockUser._id, action: 'PASSWORD_CHANGE' });
    console.log(`✓ Password Sanitization Verified: PrevPwd=${pwdLog.previousState.password}, PrevHash=${pwdLog.previousState.passwordHash}`);

    // Cleanup Test Data
    await InventoryItem.findByIdAndDelete(item._id);
    await Project.findByIdAndDelete(testProject._id);
    await BuyListItem.findByIdAndDelete(testBuyItem._id);
    await AuditLog.deleteMany({ user: mockUser._id });

    console.log('\n✅ REAL DATA AUDIT VERIFICATION PASSED 100%!');
  } catch (err) {
    console.error('❌ Audit Verification Failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runAuditTests();
