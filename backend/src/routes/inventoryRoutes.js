const express = require('express');
const router = express.Router();
const {
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem
} = require('../controllers/inventoryController');
const { adjustStock } = require('../controllers/adjustController');

const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Collection operations: GET requires authentication (admin & member), POST requires admin role
router.route('/')
  .get(requireAuth, getInventoryItems)
  .post(requireAuth, requireRole('admin'), createInventoryItem);

// Single item operations: GET requires authentication, PUT/DELETE require admin role
router.route('/:id')
  .get(requireAuth, getInventoryItemById)
  .put(requireAuth, requireRole('admin'), updateInventoryItem)
  .delete(requireAuth, requireRole('admin'), deleteInventoryItem);

// Stock adjustment endpoint: POST requires admin role
router.route('/:id/adjust')
  .post(requireAuth, requireRole('admin'), adjustStock);

module.exports = router;
