const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'MAX_STOCK', 'MOVEMENT', 'ADJUSTMENT', 'PROJECT_SHORTAGE'],
    required: true
  },
  priority: {
    type: String,
    enum: ['CRITICAL', 'WARNING', 'INFO'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    default: null
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorageNode',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // Hash signature used for smart deduplication to prevent flooding identical unread alerts
  dedupeHash: {
    type: String,
    default: null
  }
}, { timestamps: true });

// Indexes for fast retrieval and cleanup
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ dedupeHash: 1 }, { sparse: true });

module.exports = mongoose.model('Notification', notificationSchema);
