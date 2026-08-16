const express = require('express');
const router = express.Router();
const {
  createUsage,
  getAllUsage,
  getItemUsage
} = require('../controllers/usageController');
const { requireAuth } = require('../middleware/authMiddleware');

// Usage / Withdrawal routes require authentication (available to both Admin and Member)
router.route('/')
  .post(requireAuth, createUsage)
  .get(requireAuth, getAllUsage);

router.route('/item/:itemId')
  .get(requireAuth, getItemUsage);

module.exports = router;
