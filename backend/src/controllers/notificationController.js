const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const { isRead, limit = 50, page = 1 } = req.query;
    
    let query = { user: req.user._id };
    
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('item', 'name quantity lowStockThreshold')
      .populate('project', 'name')
      .lean();

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving notifications.' });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Get Unread Count Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving unread count.' });
  }
};

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark As Read Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating notification.' });
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark All As Read Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating notifications.' });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
    }

    res.status(200).json({ success: true, message: 'Notification removed' });
  } catch (error) {
    console.error('Delete Notification Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting notification.' });
  }
};

// @desc    Clear old read notifications (e.g., > 30 days old)
// @route   DELETE /api/notifications/cleanup/old
// @access  Private/Admin
exports.clearOldNotifications = async (req, res) => {
  try {
    // Optional: add admin check if desired, or restrict to own user
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      user: req.user._id,
      isRead: true,
      createdAt: { $lt: thirtyDaysAgo }
    });

    res.status(200).json({ 
      success: true, 
      message: `Cleaned up ${result.deletedCount} old notifications.` 
    });
  } catch (error) {
    console.error('Cleanup Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Server error cleaning up notifications.' });
  }
};
