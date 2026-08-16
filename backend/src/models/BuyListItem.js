const mongoose = require('mongoose');

const BuyListItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    minlength: [1, 'Item name must be at least 1 character'],
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  quantityNeeded: {
    type: Number,
    required: [true, 'Quantity needed is required'],
    min: [1, 'Quantity needed must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a positive integer'
    }
  },
  note: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Note cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['NEEDED', 'BOUGHT'],
      message: 'Status must be either NEEDED or BOUGHT'
    },
    default: 'NEEDED',
    trim: true
  }
}, {
  timestamps: true
});

// Database indexes
BuyListItemSchema.index({ name: 1 });
BuyListItemSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('BuyListItem', BuyListItemSchema);
