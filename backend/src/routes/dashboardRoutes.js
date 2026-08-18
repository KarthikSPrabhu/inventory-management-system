const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

// All dashboard routes require authentication
router.get('/summary', requireAuth, getDashboardSummary);

module.exports = router;
