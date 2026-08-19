const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearOldNotifications
} = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(requireAuth);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

// Admin or scheduled cron could hit this endpoint to cleanup old notifications
router.delete('/cleanup/old', clearOldNotifications);

module.exports = router;
