const express = require('express');
const router = express.Router();
const {
  createInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem
} = require('../controllers/inventoryController');

// Map endpoints for collection operations
router.route('/')
  .post(createInventoryItem)
  .get(getInventoryItems);

// Map endpoints for single item operations
router.route('/:id')
  .get(getInventoryItemById)
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);

module.exports = router;
