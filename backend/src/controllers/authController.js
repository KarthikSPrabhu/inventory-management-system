const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-antigravity-inventory-system-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      name: user.name,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// @desc    Authenticate user & return JWT token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password || !String(email).trim() || !String(password).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please supply both email and password'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Find user by email and explicitly include passwordHash field
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password.'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password.'
      });
    }

    // Generate token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to process sign in request. Please try again.'
    });
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private (requireAuth)
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile'
    });
  }
};

// Helper function to ensure default accounts exist on first run
exports.ensureDefaultUsersExist = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('No users found in database. Seeding initial default accounts...');
      
      const adminPasswordHash = await User.hashPassword('Admin@12345');
      const memberPasswordHash = await User.hashPassword('Member@12345');

      await User.create([
        {
          name: 'System Admin',
          email: 'admin@inventory.com',
          passwordHash: adminPasswordHash,
          role: 'admin'
        },
        {
          name: 'Team Member',
          email: 'member@inventory.com',
          passwordHash: memberPasswordHash,
          role: 'member'
        }
      ]);

      console.log('✔ Initial accounts seeded successfully!');
      console.log('  Admin: admin@inventory.com / Admin@12345');
      console.log('  Member: member@inventory.com / Member@12345');
    }
  } catch (err) {
    console.error('Failed to auto-seed default users:', err.message);
  }
};
