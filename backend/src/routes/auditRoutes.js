const express = require('express');
const router = express.Router();
const {
  getAuditLogs,
  getAuditLogById,
  getRecentActivity
} = require('../controllers/auditController');

const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All audit endpoints are strictly restricted to authenticated Administrators
router.get('/', requireAuth, requireRole('admin'), getAuditLogs);
router.get('/recent', requireAuth, requireRole('admin'), getRecentActivity);
router.get('/:id', requireAuth, requireRole('admin'), getAuditLogById);

module.exports = router;
