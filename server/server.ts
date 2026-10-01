import app from "./src/app";
import { config } from "./src/config/config";
import connectDB from "./src/config/db";
import { startViewCounterFlusher, flushViewCounters } from "./src/services/viewCounterFlusher";
import { startItineraryRequestExpirySweep } from "./src/services/itineraryRequestExpiry";
import { closeRedis } from "./src/config/redisClient";
import { warmDb, startDbKeepAlive } from "@tourbnt/db";

const startServer = async () => {
  // Connect database
  await connectDB();

  const port = Number(config.port) || 4000;

  const server = app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
  });

  startViewCounterFlusher();
  startItineraryRequestExpirySweep();

  // Open DB connections up front and keep them (and the Neon compute) warm — a cold connection
  // to the remote database costs ~2.4s, which every page paid after a short idle period.
  // Set DB_KEEP_WARM=false to allow Neon to scale to zero (cheaper, but slow first requests).
  // Warm the whole pool: pages like the dashboard summary run ~10 queries in parallel, and every
  // connection that isn't open yet costs ~1.6s to establish.
  const warmCount = Number(process.env.DATABASE_POOL_WARM || process.env.DATABASE_POOL_MAX || 10);
  void warmDb(warmCount);
  if (process.env.DB_KEEP_WARM !== 'false') startDbKeepAlive(60_000, warmCount);

  // Flush buffered view counts before exiting, so a redeploy/restart
  // (PM2, nodemon) doesn't silently drop up to one flush interval's worth.
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, flushing buffered view counts before exit...`);
    try {
      await flushViewCounters();
    } catch (err) {
      console.error('Final view counter flush failed:', (err as Error).message);
    }
    await closeRedis();
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

startServer();
