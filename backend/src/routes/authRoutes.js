const express = require('express');
const router = express.Router();
const { login, getMe, changePassword } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public auth routes
router.post('/login', login);

// Protected auth routes
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);

module.exports = router;
