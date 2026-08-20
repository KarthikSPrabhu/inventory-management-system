const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    trim: true,
    default: 'System / Guest'
  },
  userEmail: {
    type: String,
    trim: true,
    default: 'system@inventory.local'
  },
  action: {
    type: String,
    required: [true, 'Audit action is required'],
    index: true
  },
  resourceType: {
    type: String,
    required: [true, 'Resource type is required'],
    enum: [
      'InventoryItem',
      'StorageNode',
      'Project',
      'BuyListItem',
      'User',
      'System',
      'Report'
    ],
    index: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  resourceName: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  description: {
    type: String,
    required: [true, 'Audit description is required'],
    trim: true
  },
  previousState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Audit log is strictly append-only (no updatedAt)
});

// Indexes for fast administrative querying & filtering
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
