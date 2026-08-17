const mongoose = require('mongoose');

const InventoryAdjustmentSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: [true, 'Item reference is required']
  },
  previousQuantity: {
    type: Number,
    required: [true, 'Previous quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  newQuantity: {
    type: Number,
    required: [true, 'New quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  difference: {
    type: Number,
    required: [true, 'Difference is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason for adjustment is required'],
    trim: true
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
InventoryAdjustmentSchema.index({ item: 1, createdAt: -1 });
InventoryAdjustmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryAdjustment', InventoryAdjustmentSchema);
