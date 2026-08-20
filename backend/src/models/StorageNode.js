const mongoose = require('mongoose');

const StorageNodeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Storage node name is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['SECTION', 'STORAGE_UNIT', 'CONTAINER'],
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorageNode',
    default: null
  },
  section: {
    type: String,
    required: [true, 'Top level section is required'],
    trim: true,
    uppercase: true
  },
  code: {
    type: String,
    required: [true, 'Node component code is required'],
    trim: true,
    uppercase: true
  },
  // We can optionally store the pre-computed hierarchy path array or string to make 
  // recursive querying faster, but we'll stick to a simple parentId for now.
}, {
  timestamps: true
});

// Indexes for performance
StorageNodeSchema.index({ parentId: 1, section: 1 });
StorageNodeSchema.index({ code: 1, section: 1 });
StorageNodeSchema.index({ parentId: 1 });
StorageNodeSchema.index({ section: 1 });
StorageNodeSchema.index({ type: 1 });

// Validation to prevent invalid hierarchies
StorageNodeSchema.pre('save', async function(next) {
  if (this.type === 'SECTION') {
    if (this.parentId) {
      return next(new Error('A SECTION cannot have a parent.'));
    }
  } else if (this.type === 'STORAGE_UNIT') {
    if (!this.parentId) {
      return next(new Error('A STORAGE_UNIT must have a parent SECTION.'));
    }
    const parent = await mongoose.model('StorageNode').findById(this.parentId);
    if (!parent || parent.type !== 'SECTION') {
      return next(new Error('A STORAGE_UNIT can only be a child of a SECTION.'));
    }
    const unitNum = parseInt(this.code, 10);
    if (isNaN(unitNum) || unitNum < 1 || unitNum > 6) {
      return next(new Error('Primary Storage Unit code must be a number between 1 and 6.'));
    }
  } else if (this.type === 'CONTAINER') {
    if (!this.parentId) {
      return next(new Error('A CONTAINER must have a parent (STORAGE_UNIT or CONTAINER).'));
    }
    const parent = await mongoose.model('StorageNode').findById(this.parentId);
    if (!parent || (parent.type !== 'STORAGE_UNIT' && parent.type !== 'CONTAINER')) {
      return next(new Error('A CONTAINER can only be a child of a STORAGE_UNIT or another CONTAINER.'));
    }
    const boxNum = parseInt(this.code, 10);
    if (isNaN(boxNum) || boxNum < 1) {
      return next(new Error('Container box number must be a positive integer.'));
    }
  }

  // Prevent self-referential loops (basic)
  if (this.parentId && this.parentId.equals(this._id)) {
    return next(new Error('A node cannot be its own parent.'));
  }

  next();
});

module.exports = mongoose.model('StorageNode', StorageNodeSchema);
