const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('./config/db');

// Initialize Express App
const app = express();

// Connect to MongoDB Atlas
connectDB();

// 1. Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Prevents breaking inline image/data assets
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS Configuration
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

const envOrigins = (process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...envOrigins]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Allow requests with no origin (curl, postman, mobile apps)
  if (allowedOriginsSet.has(origin)) return true;
  if (process.env.CLIENT_URL === '*') return true;

  // Dynamically match local LAN IP origins (e.g., http://192.168.x.x:5173, http://10.x.x.x:5173)
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const isLocalLAN = 
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname);

    if (isLocalLAN) return true;
  } catch {
    return false;
  }

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));

// 3. Request Body Parsing Limits (10MB limit protects memory while enabling image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. Rate Limiting Middleware
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Max 300 requests per 15 mins for general API
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

// Apply rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/', apiLimiter);

// Request Logger (Development Diagnostics)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Register Authentication REST routes
const authRoutes = require('./routes/authRoutes');
const { ensureDefaultUsersExist } = require('./controllers/authController');
app.use('/api/auth', authRoutes);

// Auto-seed default accounts if User collection is empty
ensureDefaultUsersExist();

// Register Inventory REST routes
const inventoryRoutes = require('./routes/inventoryRoutes');
app.use('/api/inventory', inventoryRoutes);

// Register Usage / Withdrawal REST routes
const usageRoutes = require('./routes/usageRoutes');
app.use('/api/usage', usageRoutes);

// Register Project REST routes
const projectRoutes = require('./routes/projectRoutes');
app.use('/api/projects', projectRoutes);

// Register Stock-In REST routes
const stockInRoutes = require('./routes/stockInRoutes');
app.use('/api/stock-in', stockInRoutes);

// Register Analytics REST routes
const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api/analytics', analyticsRoutes);

// Register Buy List REST routes
const buyListRoutes = require('./routes/buyListRoutes');
app.use('/api/buy-list', buyListRoutes);

// Simple backend health-check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Inventory API is running'
  });
});

// 5. 404 API Route Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.'
  });
});

// 6. Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Server Error:', err);
  }
  
  if (err.message === 'Blocked by CORS policy') {
    return res.status(403).json({
      success: false,
      message: 'Access denied by CORS policy.'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'An internal server error occurred' 
      : err.message || 'An internal server error occurred'
  });
});

// Port configuration
const PORT = process.env.PORT || 5000;

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful Server Shutdown Handling (SIGINT & SIGTERM)
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = app;
