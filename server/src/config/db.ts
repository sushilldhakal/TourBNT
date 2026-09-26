import mongoose from "mongoose";
import { pingDb } from "@tourbnt/db";
import { config } from "./config";

/**
 * Connect to Postgres (single source of truth — see packages/db) and,
 * if configured, the legacy MongoDB instance that not-yet-migrated
 * controllers still depend on.
 */
const connectDB = async (retries = 5, delay = 5000) => {
  await connectPostgres(retries, delay);

  if (config.databaseUrl) {
    await connectMongo(retries, delay);
  } else {
    console.warn('⚠️  MONGO_CONNECTION_STRING not set — controllers not yet migrated to Postgres will fail until they are ported to @tourbnt/db.');
  }
};

const connectPostgres = async (retries: number, delay: number) => {
  for (let i = 0; i < retries; i++) {
    try {
      await pingDb();
      console.log('✅ Postgres connected successfully (single source of truth)');
      return;
    } catch (error) {
      console.error(`❌ Postgres connection attempt ${i + 1}/${retries} failed:`, error);

      if (i < retries - 1) {
        console.log(`⏳ Retrying Postgres connection in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('💥 Failed to connect to Postgres after multiple attempts');
        if (config.env === 'production') {
          process.exit(1);
        } else {
          console.warn('⚠️  Running in development mode - continuing without Postgres. Set DATABASE_URL to enable it.');
        }
      }
    }
  }
};

const connectMongo = async (retries: number, delay: number) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(config.databaseUrl!);

      console.log('✅ MongoDB (legacy) connected successfully');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🌍 Environment: ${config.env}`);

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      });

      return;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${i + 1}/${retries} failed:`, error);

      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('💥 Failed to connect to MongoDB after multiple attempts');
        console.warn('⚠️  Continuing without MongoDB - only Postgres-backed routes will work.');
      }
    }
  }
};

export default connectDB;
