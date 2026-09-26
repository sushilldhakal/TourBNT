import { pingDb } from "@tourbnt/db";
import { config } from "./config";

/**
 * Connect to Postgres — single source of truth (see packages/db).
 */
const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await pingDb();
      console.log('✅ Postgres connected successfully');
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

export default connectDB;
