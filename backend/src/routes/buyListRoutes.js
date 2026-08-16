const express = require('express');
const router = express.Router();
const {
  getBuyListItems,
  createBuyListItem,
  updateBuyListItem,
  deleteBuyListItem
} = require('../controllers/buyListController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All Buy List routes require authentication
router.use(requireAuth);

router.route('/')
  .get(getBuyListItems)
  .post(requireRole('admin'), createBuyListItem);

router.route('/:id')
  .patch(updateBuyListItem)
  .delete(requireRole('admin'), deleteBuyListItem);

module.exports = router;
