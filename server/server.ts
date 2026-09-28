import app from "./src/app";
import { config } from "./src/config/config";
import connectDB from "./src/config/db";
import { startViewCounterFlusher, flushViewCounters } from "./src/services/viewCounterFlusher";
import { closeRedis } from "./src/config/redisClient";

const startServer = async () => {
  // Connect database
  await connectDB();

  const port = Number(config.port) || 4000;

  const server = app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
  });

  startViewCounterFlusher();

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
