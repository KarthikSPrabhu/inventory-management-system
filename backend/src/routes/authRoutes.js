const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public auth routes
router.post('/login', login);

// Protected auth routes
router.get('/me', requireAuth, getMe);

module.exports = router;
