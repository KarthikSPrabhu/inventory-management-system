const express = require('express');
const router = express.Router();
const { createStockIn } = require('../controllers/stockInController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Stock-In / Restocking is restricted to Admin role
router.route('/')
  .post(requireAuth, requireRole('admin'), createStockIn);

module.exports = router;
