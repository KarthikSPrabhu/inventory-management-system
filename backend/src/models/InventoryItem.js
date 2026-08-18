const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  section: {
    type: String,
    required: [true, 'Location section is required'],
    trim: true,
    uppercase: true
  },
  storageUnit: {
    type: Number,
    required: [true, 'Location storage unit is required'],
    min: [1, 'Storage unit must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Storage unit must be an integer'
    }
  },
  box: {
    type: Number,
    required: [true, 'Location box is required'],
    min: [1, 'Box must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Box must be an integer'
    }
  },
  code: {
    type: String,
    required: [true, 'Location code is required'],
    trim: true,
    uppercase: true
  }
}, { _id: false });

// Validate that the location code matches Section + StorageUnit + Box
LocationSchema.path('code').validate(function(value) {
  const sectionPart = (this.section || '').trim().toUpperCase();
  const unitPart = this.storageUnit;
  const boxPart = this.box;
  
  if (!sectionPart || unitPart === undefined || boxPart === undefined) {
    return false;
  }
  
  const expectedCode = `${sectionPart}${unitPart}${boxPart}`;
  const providedCode = (value || '').trim().toUpperCase();
  
  return providedCode === expectedCode;
}, 'Location code is inconsistent with the structured section, storageUnit, and box details (e.g. section "A" + storageUnit 3 + box 19 = code "A319").');

const InventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Inventory item name is required'],
    trim: true,
    minlength: [1, 'Item name must be at least 1 character long'],
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  image: {
    type: String,
    default: ''
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be an integer'
    }
  },
  locations: [{
    node: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StorageNode',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Location quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Location quantity must be an integer'
      }
    }
  }],
  // For backwards compatibility and migration state tracker:
  // If location exists, it means the item hasn't been migrated yet.
  location: {
    type: LocationSchema,
    required: false // No longer strictly required to allow migration
  },
  lowStockThreshold: {
    type: Number,
    min: [0, 'Low stock threshold cannot be negative'],
    default: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Low stock threshold must be an integer'
    }
  },
  category: {
    type: String,
    default: 'Other',
    trim: true
  },
  minimumStock: {
    type: Number,
    min: [0, 'Minimum stock cannot be negative'],
    default: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Minimum stock must be an integer'
    }
  },
  maximumStock: {
    type: Number,
    min: [0, 'Maximum stock cannot be negative'],
    default: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Maximum stock must be an integer'
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Database indexes for performance
InventoryItemSchema.index({ name: 1 });
InventoryItemSchema.index({ 'location.code': 1 });
InventoryItemSchema.index({ quantity: 1 });
InventoryItemSchema.index({ category: 1 });
InventoryItemSchema.index({ isArchived: 1 });

InventoryItemSchema.index({ 'locations.node': 1 });

// Ensure total quantity matches the sum of locations
InventoryItemSchema.pre('save', function(next) {
  if (this.locations && this.locations.length > 0) {
    this.quantity = this.locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
  }
  next();
});

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
