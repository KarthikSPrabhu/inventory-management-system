const mongoose = require('mongoose');

const InventoryUsageSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: [true, 'Item reference is required']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project reference is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity to take must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be an integer'
    }
  },
  location: {
    type: String,
    required: [true, 'Location code is required'],
    trim: true,
    uppercase: true
  },
  notes: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Database indexes for audit & analytics performance
InventoryUsageSchema.index({ item: 1, createdAt: -1 });
InventoryUsageSchema.index({ project: 1, createdAt: -1 });
InventoryUsageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryUsage', InventoryUsageSchema);
