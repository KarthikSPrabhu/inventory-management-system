const express = require('express');
const router = express.Router();
const {
  getSummary,
  getMostUsedItems,
  getMostUsedProjects,
  getLowStockItems,
  getMovementTimeline
} = require('../controllers/analyticsController');

// All analytics routes are read-only calculations from MongoDB Atlas
router.get('/summary', getSummary);
router.get('/most-used-items', getMostUsedItems);
router.get('/most-used-projects', getMostUsedProjects);
router.get('/low-stock', getLowStockItems);
router.get('/movement', getMovementTimeline);

module.exports = router;
