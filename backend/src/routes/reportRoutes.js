const express = require('express');
const router = express.Router();
const {
  getInventoryReport,
  getLocationReport,
  getLowStockReport,
  getOutOfStockReport,
  getStockMovementReport,
  getProjectUsageReport,
  getBuyListReport,
  exportReport,
  previewImportCsv,
  confirmImportCsv
} = require('../controllers/reportController');

const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All report endpoints require authentication
router.get('/inventory', requireAuth, getInventoryReport);
router.get('/location', requireAuth, getLocationReport);
router.get('/low-stock', requireAuth, getLowStockReport);
router.get('/out-of-stock', requireAuth, getOutOfStockReport);
router.get('/movement', requireAuth, getStockMovementReport);
router.get('/project-usage', requireAuth, getProjectUsageReport);
router.get('/buy-list', requireAuth, getBuyListReport);
router.get('/export', requireAuth, exportReport);

// CSV Import endpoints (Admin only)
router.post('/import/preview', requireAuth, requireRole('admin'), previewImportCsv);
router.post('/import/confirm', requireAuth, requireRole('admin'), confirmImportCsv);

module.exports = router;
