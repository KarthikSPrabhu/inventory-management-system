const mongoose = require('mongoose');

const InventoryStockInSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: [true, 'Item reference is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity to add must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a positive integer'
    }
  },
  reason: {
    type: String,
    required: [true, 'Reason for stock-in is required'],
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

module.exports = mongoose.model('InventoryStockIn', InventoryStockInSchema);
