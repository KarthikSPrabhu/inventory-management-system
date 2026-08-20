const Project = require('../models/Project');
const InventoryUsage = require('../models/InventoryUsage');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Create new project
// @route   POST /api/projects
// @access  Public
exports.createProject = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Project name cannot exceed 100 characters'
      });
    }

    // Check duplicate project name case-insensitively
    const existing = await Project.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A project with this name already exists'
      });
    }

    const project = new Project({
      name: trimmedName,
      description: description ? String(description).trim() : '',
      status: status || 'active'
    });

    await project.save();

    const auditService = require('../services/auditService');
    const { AUDIT_ACTIONS } = require('../utils/auditActions');

    await auditService.log({
      req,
      action: AUDIT_ACTIONS.PROJECT_CREATE,
      resourceType: 'Project',
      resourceId: project._id,
      resourceName: project.name,
      description: `Created new project "${project.name}" (${project.status})`,
      newState: project.toObject ? project.toObject() : project
    });

    res.status(201).json({
      success: true,
      message: `Project "${project.name}" created successfully.`,
      data: project
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    console.error('Create Project Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to create project. Please try again.'
    });
  }
};

// @desc    Get all projects with usage metrics
// @route   GET /api/projects
// @access  Public
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({}).sort({ createdAt: -1 });

    // Compute aggregated usage metrics for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (proj) => {
        const usageRecords = await InventoryUsage.find({ project: proj._id });
        
        const uniqueItems = new Set();
        let totalUnitsUsed = 0;

        usageRecords.forEach((rec) => {
          if (rec.item) {
            uniqueItems.add(String(rec.item));
          }
          totalUnitsUsed += Number(rec.quantity) || 0;
        });

        return {
          ...proj.toObject(),
          stats: {
            differentItemsCount: uniqueItems.size,
            totalUnitsUsed
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: projectsWithStats
    });
  } catch (error) {
    console.error('Get Projects Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve projects.'
    });
  }
};

// @desc    Get project suggestions for Take Item modal
// @route   GET /api/projects/suggestions
// @access  Public
exports.getProjectSuggestions = async (req, res) => {
  try {
    const { itemId } = req.query;

    // Fetch active projects only for default suggestions
    const activeProjects = await Project.find({ status: 'active' }).sort({ name: 1 });

    let usedProjectIds = new Set();
    if (itemId && isValidId(itemId)) {
      const usageRecords = await InventoryUsage.find({ item: itemId });
      usageRecords.forEach(u => usedProjectIds.add(String(u.project)));
    }

    // Rank projects: Projects that previously used this item first, then other active projects
    const rankedSuggestions = activeProjects.map((proj) => {
      const isUsedBefore = usedProjectIds.has(String(proj._id));
      return {
        _id: proj._id,
        name: proj.name,
        description: proj.description,
        status: proj.status,
        usedBefore: isUsedBefore,
        reason: isUsedBefore ? 'Used this item before' : 'Active project'
      };
    });

    // Sort: usedBefore === true first, then alphabetically by name
    rankedSuggestions.sort((a, b) => {
      if (a.usedBefore && !b.usedBefore) return -1;
      if (!a.usedBefore && b.usedBefore) return 1;
      return a.name.localeCompare(b.name);
    });

    res.status(200).json({
      success: true,
      data: rankedSuggestions
    });
  } catch (error) {
    console.error('Get Suggestions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve project suggestions.'
    });
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Public
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Get Project By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve project details.'
    });
  }
};

// @desc    Update project (name, description, status)
// @route   PATCH /api/projects/:id
// @access  Public
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          message: 'Project name cannot be empty'
        });
      }

      // Check name uniqueness if changed
      if (trimmed.toLowerCase() !== project.name.toLowerCase()) {
        const existing = await Project.findOne({
          _id: { $ne: id },
          name: { $regex: new RegExp(`^${trimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'A project with this name already exists'
          });
        }
      }
      project.name = trimmed;
    }

    if (description !== undefined) {
      project.description = String(description).trim();
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'completed', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be active, completed, or archived'
        });
      }
      project.status = status;
    }

    const prevSnapshot = project.toObject ? project.toObject() : { ...project };
    await project.save();

    const auditService = require('../services/auditService');
    const { AUDIT_ACTIONS } = require('../utils/auditActions');

    await auditService.log({
      req,
      action: AUDIT_ACTIONS.PROJECT_UPDATE,
      resourceType: 'Project',
      resourceId: project._id,
      resourceName: project.name,
      description: `Updated project "${project.name}"`,
      previousState: prevSnapshot,
      newState: project.toObject ? project.toObject() : project
    });

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    console.error('Update Project Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to update project.'
    });
  }
};

// @desc    Get aggregated inventory usage for a specific project
// @route   GET /api/projects/:id/usage
// @access  Public
exports.getProjectUsage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Fetch all usage records for this project and populate item details
    const usageRecords = await InventoryUsage.find({ project: id })
      .populate('item')
      .sort({ createdAt: -1 });

    // Aggregate usage by item._id so multiple withdrawals of the same item sum up!
    const aggregatedMap = new Map();
    let totalUnitsUsed = 0;

    usageRecords.forEach((rec) => {
      if (!rec.item) return;

      const itemId = String(rec.item._id);
      const qty = Number(rec.quantity) || 0;
      totalUnitsUsed += qty;

      if (aggregatedMap.has(itemId)) {
        const existing = aggregatedMap.get(itemId);
        existing.quantityUsed += qty;
        // Keep latest notes if helpful
        if (rec.notes && !existing.notes.includes(rec.notes)) {
          existing.notes = existing.notes ? `${existing.notes}; ${rec.notes}` : rec.notes;
        }
      } else {
        aggregatedMap.set(itemId, {
          item: rec.item,
          quantityUsed: qty,
          location: rec.location || rec.item.location?.code || 'N/A',
          notes: rec.notes || ''
        });
      }
    });

    const aggregatedItems = Array.from(aggregatedMap.values());

    res.status(200).json({
      success: true,
      data: {
        project,
        summary: {
          differentItemsCount: aggregatedItems.length,
          totalUnitsUsed
        },
        items: aggregatedItems,
        activityRecords: usageRecords
      }
    });
  } catch (error) {
    console.error('Get Project Usage Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve project usage.'
    });
  }
};

// @desc    Delete project and clean up usage records
// @route   DELETE /api/projects/:id
// @access  Public
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Protect historical integrity: check if project has associated usage records
    const hasUsage = await InventoryUsage.exists({ project: id });
    if (hasUsage) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete project "${project.name}" because it has associated inventory usage records. Set its status to Archived instead to preserve data integrity.`
      });
    }

    // Delete project
    await project.deleteOne();

    const auditService = require('../services/auditService');
    const { AUDIT_ACTIONS } = require('../utils/auditActions');

    await auditService.log({
      req,
      action: AUDIT_ACTIONS.PROJECT_DELETE,
      resourceType: 'Project',
      resourceId: id,
      resourceName: project.name,
      description: `Deleted project "${project.name}"`,
      previousState: project.toObject ? project.toObject() : project
    });

    res.status(200).json({
      success: true,
      message: `Project "${project.name}" deleted successfully.`,
      data: { id }
    });
  } catch (error) {
    console.error('Delete Project Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to delete project.'
    });
  }
};

