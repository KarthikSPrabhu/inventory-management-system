const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    unique: true,
    trim: true,
    minlength: [1, 'Project name must be at least 1 character'],
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Project description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'completed', 'archived'],
      message: 'Status must be active, completed, or archived'
    },
    default: 'active',
    lowercase: true,
    trim: true
  }
}, {
  timestamps: true
});

// Database indexes for status queries
ProjectSchema.index({ status: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
