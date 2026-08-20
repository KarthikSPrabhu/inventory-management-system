const express = require('express');
const router = express.Router();
const multer = require('multer');

const backupController = require('../controllers/backupController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Configure multer for memory storage (max file size 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Protect all backup routes for administrators only
router.use(requireAuth);
router.use(requireRole('admin'));

// Route definitions
router.get('/', backupController.listBackups);
router.post('/create', backupController.createBackup);
router.get('/:filename/download', backupController.downloadBackup);
router.post('/preview', upload.single('file'), backupController.previewBackup);
router.post('/restore', upload.single('file'), backupController.restoreBackup);

module.exports = router;
