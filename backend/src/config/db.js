const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.warn('WARNING: MONGODB_URI is not defined in environment variables. Connection skipped or deferred.');
      return;
    }

    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.warn('The server is running, but database connection has failed. Please verify that MongoDB is running locally or check your connection string.');
  }
};

module.exports = connectDB;
