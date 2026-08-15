const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('./config/db');

// Initialize Express App
const app = express();

// Connect to MongoDB
connectDB();

// Middleware Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // standard Vite port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register Inventory REST routes
const inventoryRoutes = require('./routes/inventoryRoutes');
app.use('/api/inventory', inventoryRoutes);

// Register Usage / Withdrawal REST routes
const usageRoutes = require('./routes/usageRoutes');
app.use('/api/usage', usageRoutes);

// Register Project REST routes
const projectRoutes = require('./routes/projectRoutes');
app.use('/api/projects', projectRoutes);

// Request Logger (simple middleware for beginner readability)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple backend health-check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inventory API is running"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "An internal server error occurred"
  });
});

// Port configuration
const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
