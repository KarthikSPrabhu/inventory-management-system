const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('FATAL DATABASE ERROR: MONGODB_URI is not defined in environment variables.');
    console.error('Please configure a valid MONGODB_URI inside backend/.env before starting the server.');
    process.exit(1);
  }

  // Safely extract host details for secure logging (masking usernames and passwords)
  let safeHost = 'database host';
  try {
    const match = mongoURI.match(/@([^/?#]+)/);
    if (match) {
      safeHost = match[1];
    } else {
      const hostMatch = mongoURI.match(/\/\/([^/?#]+)/);
      if (hostMatch) {
        safeHost = hostMatch[1];
      }
    }
  } catch (e) {
    // Parse fallback
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error('FATAL DATABASE ERROR: MongoDB connection failed.');
    console.error(`Attempted Connection Host: ${safeHost}`);
    console.error(`Connection Error Details: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
