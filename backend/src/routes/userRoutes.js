const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser } = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All user routes require authentication and admin privileges
router.use(requireAuth, requireRole('admin'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser);

module.exports = router;
