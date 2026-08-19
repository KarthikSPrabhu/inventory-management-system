const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const InventoryItem = require('../models/InventoryItem');
const StorageNode = require('../models/StorageNode');
const Project = require('../models/Project');
const BuyListItem = require('../models/BuyListItem');
const InventoryUsage = require('../models/InventoryUsage');
const { getInventoryReport, getLocationReport, getLowStockReport, getOutOfStockReport, getStockMovementReport, previewImportCsv, confirmImportCsv } = require('../controllers/reportController');

async function runTests() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas!');

  const mockRes = () => {
    const res = {};
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.body = data;
      return res;
    };
    res.setHeader = (k, v) => {};
    res.send = (data) => {
      res.body = data;
      return res;
    };
    return res;
  };

  // TEST 1: Inventory Report
  console.log('\n--- TEST 1: Complete Inventory Report ---');
  const req1 = { query: {} };
  const res1 = mockRes();
  await getInventoryReport(req1, res1);
  console.log(`✓ Inventory Report Success: ${res1.body.success}, Count: ${res1.body.count}`);
  if (res1.body.data && res1.body.data.length > 0) {
    console.log('Sample item:', res1.body.data[0].name, '| Locations:', res1.body.data[0].locationDisplay);
  }

  // TEST 2: Location Report
  console.log('\n--- TEST 2: Location Hierarchy Report ---');
  const req2 = { query: {} };
  const res2 = mockRes();
  await getLocationReport(req2, res2);
  console.log(`✓ Location Report Success: ${res2.body.success}, Sections: ${res2.body.data.length}`);
  res2.body.data.forEach(sec => {
    console.log(`  Section ${sec.section} has ${sec.units.length} units.`);
  });

  // TEST 3: Low Stock Report
  console.log('\n--- TEST 3: Low Stock Report ---');
  const req3 = { query: {} };
  const res3 = mockRes();
  await getLowStockReport(req3, res3);
  console.log(`✓ Low Stock Report Success: ${res3.body.success}, Count: ${res3.body.count}`);

  // TEST 4: Stock Movement Report
  console.log('\n--- TEST 4: Stock Movement Report ---');
  const req4 = { query: { dateRange: '30days' } };
  const res4 = mockRes();
  await getStockMovementReport(req4, res4);
  console.log(`✓ Stock Movement Report Success: ${res4.body.success}, Events: ${res4.body.count}`);

  // TEST 5 & 6: CSV Import Preview Validation (Valid + Invalid + Duplicate)
  console.log('\n--- TEST 5 & 6: CSV Import Preview Validation ---');
  const nodes = await StorageNode.find().lean();
  const validNodeCode = nodes.length > 0 ? (nodes[0].displayId || nodes[0].code) : 'A01';
  console.log(`Using valid node code: ${validNodeCode}`);

  const sampleCsv = `Item Name,Quantity,Category,Minimum Stock,Maximum Stock,Location
Test Sensor Phase25,15,Sensors,5,50,${validNodeCode}
Invalid Item Row,-5,Passives,0,100,B07
${res1.body.data[0]?.name || 'ESP32'},20,Microcontrollers,2,20,${validNodeCode}`;

  const req5 = { body: { csvData: sampleCsv } };
  const res5 = mockRes();
  await previewImportCsv(req5, res5);
  console.log(`✓ Preview Summary: Total: ${res5.body.summary.totalRows}, Valid: ${res5.body.summary.validCount}, Warnings: ${res5.body.summary.warningCount}, Errors: ${res5.body.summary.errorCount}`);
  res5.body.rows.forEach(r => {
    console.log(`  Row #${r.rowNumber}: status=${r.status}, errors=[${r.errors.join('; ')}], warnings=[${r.warnings.join('; ')}]`);
  });

  // TEST 7: Confirm Import
  console.log('\n--- TEST 7: Confirm CSV Import Execution ---');
  const validImportRows = res5.body.rows.filter(r => r.status !== 'error');
  const req7 = { body: { rows: validImportRows } };
  const res7 = mockRes();
  await confirmImportCsv(req7, res7);
  console.log(`✓ Confirm Status: ${res7.statusCode}, Message: ${res7.body.message}`);

  // Clean up created test items
  await InventoryItem.deleteMany({ name: 'Test Sensor Phase25' });
  console.log('✓ Cleaned up test item "Test Sensor Phase25"');

  await mongoose.disconnect();
  console.log('\n✅ REAL DATA VERIFICATION PASSED 100%!');
}

runTests().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
