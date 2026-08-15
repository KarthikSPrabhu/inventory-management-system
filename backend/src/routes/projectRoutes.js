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

router.route('/')
  .post(createProject)
  .get(getProjects);

router.route('/suggestions')
  .get(getProjectSuggestions);

router.route('/:id')
  .get(getProjectById)
  .patch(updateProject)
  .delete(deleteProject);

router.route('/:id/usage')
  .get(getProjectUsage);

module.exports = router;
