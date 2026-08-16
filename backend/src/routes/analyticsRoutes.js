const express = require('express');
const router = express.Router();
const {
  getSummary,
  getMostUsedItems,
  getMostUsedProjects,
  getLowStockItems,
  getMovementTimeline
} = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/authMiddleware');

// All analytics routes require authentication and are read-only
router.get('/summary', requireAuth, getSummary);
router.get('/most-used-items', requireAuth, getMostUsedItems);
router.get('/most-used-projects', requireAuth, getMostUsedProjects);
router.get('/low-stock', requireAuth, getLowStockItems);
router.get('/movement', requireAuth, getMovementTimeline);

module.exports = router;
