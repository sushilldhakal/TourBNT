import mongoose from "mongoose";
import { config } from "./config";

/**
 * Connect to MongoDB with retry logic
 * @param retries - Number of retry attempts
 * @param delay - Delay between retries in milliseconds
 */
const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(config.databaseUrl);

      console.log('✅ Database connected successfully');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🌍 Environment: ${config.env}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      });

      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, error);

      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('💥 Failed to connect to database after multiple attempts');
        if (config.env === 'production') {
          process.exit(1);
        } else {
          console.warn('⚠️  Running in development mode - continuing without database');
        }
      }
    }
  }
};

export default connectDB;
