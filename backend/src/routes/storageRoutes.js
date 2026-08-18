const express = require('express');
const router = express.Router();
const {
  getStorageTree,
  createStorageNode,
  deleteStorageNode,
  resolveStoragePath
} = require('../controllers/storageController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.route('/tree').get(requireAuth, getStorageTree);
router.route('/resolve').post(requireAuth, resolveStoragePath);
router.route('/').post(requireAuth, requireRole('admin'), createStorageNode);
router.route('/:id').delete(requireAuth, requireRole('admin'), deleteStorageNode);

module.exports = router;
