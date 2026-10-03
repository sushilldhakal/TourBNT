import express from 'express';
import { pingDb } from '../../db';
import { getRedisClient } from '../../config/redisClient';

/**
 * GET /api/v1/health — for uptime monitors (UptimeRobot, Better Stack, ...).
 *
 *  200 { status: 'ok' }        the API and its database are working
 *  200 { status: 'degraded' }  working, but Redis (the cache) is down — pages are slower, nothing is broken
 *  503 { status: 'down' }      the database is unreachable
 *
 * Unlike /monitoring/health this ignores recent HTTP error rates (bots probing for /.env would otherwise page you)
 * and actually tests the dependencies. Each check has a short timeout so a hung dependency can't hang the monitor.
 */
const router = express.Router();

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

router.get('/', async (_req, res) => {
  const [db, redis] = await Promise.all([
    withTimeout(pingDb(), 3000).then(() => true).catch(() => false),
    withTimeout(getRedisClient().ping(), 2000).then((r) => r === 'PONG').catch(() => false),
  ]);
  const status = !db ? 'down' : redis ? 'ok' : 'degraded';
  res.setHeader('Cache-Control', 'no-store');
  res.status(db ? 200 : 503).json({ status, db, redis, uptimeSeconds: Math.round(process.uptime()) });
});

export default router;
