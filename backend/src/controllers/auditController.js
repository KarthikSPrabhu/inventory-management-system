const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// @desc    Get Paginated & Filtered Audit Logs
// @route   GET /api/audit-logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      action,
      resourceType,
      user,
      dateRange,
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 25;
    const skip = (pageNum - 1) * limitNum;

    const queryAnd = [];

    // Filter by action
    if (action && action !== 'All') {
      queryAnd.push({ action: String(action).trim() });
    }

    // Filter by resourceType
    if (resourceType && resourceType !== 'All') {
      queryAnd.push({ resourceType: String(resourceType).trim() });
    }

    // Filter by user ObjectId
    if (user && user !== 'All' && mongoose.Types.ObjectId.isValid(user)) {
      queryAnd.push({ user: new mongoose.Types.ObjectId(user) });
    }

    // Search query (matches description, userName, userEmail, resourceName)
    if (search && String(search).trim()) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      queryAnd.push({
        $or: [
          { description: searchRegex },
          { userName: searchRegex },
          { userEmail: searchRegex },
          { resourceName: searchRegex },
          { action: searchRegex }
        ]
      });
    }

    // Date range filter
    const now = new Date();
    if (dateRange === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      queryAnd.push({ createdAt: { $gte: startOfDay } });
    } else if (dateRange === 'yesterday') {
      const startOfYesterday = new Date(now.setDate(now.getDate() - 1));
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(startOfYesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      queryAnd.push({ createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } });
    } else if (dateRange === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      queryAnd.push({ createdAt: { $gte: d } });
    } else if (dateRange === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      queryAnd.push({ createdAt: { $gte: d } });
    } else if (dateRange === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      queryAnd.push({ createdAt: { $gte: startOfMonth } });
    } else if (startDate && endDate) {
      queryAnd.push({
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });
    }

    const query = queryAnd.length > 0 ? { $and: queryAnd } : {};

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .select('-previousState -newState -metadata')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name email role')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: logs
    });
  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
};

// @desc    Get Audit Log By ID
// @route   GET /api/audit-logs/:id
// @access  Private (Admin only)
exports.getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Audit Log ID.' });
    }

    const logEntry = await AuditLog.findById(id).populate('user', 'name email role').lean();
    if (!logEntry) {
      return res.status(404).json({ success: false, message: 'Audit log entry not found.' });
    }

    res.status(200).json({
      success: true,
      data: logEntry
    });
  } catch (error) {
    console.error('Get Audit Log By ID Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit log details.' });
  }
};

// @desc    Get Recent System Activity (Top 10 logs for Dashboard)
// @route   GET /api/audit-logs/recent
// @access  Private (Admin only)
exports.getRecentActivity = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email role')
      .lean();

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get Recent Activity Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve recent activity.' });
  }
};
