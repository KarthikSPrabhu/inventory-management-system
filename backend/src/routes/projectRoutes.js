const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectSuggestions,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectUsage
} = require('../controllers/projectController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.route('/')
  .get(requireAuth, getProjects)
  .post(requireAuth, requireRole('admin'), createProject);

router.route('/suggestions')
  .get(requireAuth, getProjectSuggestions);

router.route('/:id')
  .get(requireAuth, getProjectById)
  .patch(requireAuth, requireRole('admin'), updateProject)
  .delete(requireAuth, requireRole('admin'), deleteProject);

router.route('/:id/usage')
  .get(requireAuth, getProjectUsage);

module.exports = router;
