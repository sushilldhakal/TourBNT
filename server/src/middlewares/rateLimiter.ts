import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Request } from 'express';
import { HTTP_STATUS } from '../utils/apiResponse';
import { metricsCollector } from '../utils/metrics';
import { getRedisClient } from '../config/redisClient';

/**
 * Shared across every limiter below so counts are correct across all PM2
 * cluster workers (the default in-memory store counts per-process, so a
 * limit of N per IP silently becomes N * workerCount). If Redis is down,
 * ioredis's own retry/backoff (see redisClient.ts) means calls here reject
 * quickly rather than hang — express-rate-limit then fails the request
 * open rather than blocking it, so a Redis outage degrades rate limiting,
 * it doesn't take the API down.
 */
const makeStore = (prefix: string) =>
    new RedisStore({
        prefix,
        // ioredis answers with the raw Redis reply, which is what RedisStore expects.
        sendCommand: (command: string, ...args: string[]) => getRedisClient().call(command, ...args) as Promise<RedisReply>,
    });

/**
 * A call made by this server itself — in practice the Next.js server rendering a page and fetching its
 * data from the API on the same machine. Those are not a visitor hammering the API, and they would all
 * land in one shared bucket and throttle page renders for everyone.
 *
 * Deliberately narrow: the connection must come from this machine's own loopback address AND carry no
 * X-Forwarded-For. nginx adds that header to every request it relays (see /etc/nginx), so outside
 * traffic never qualifies, and nobody outside the machine can open a loopback connection.
 */
export function isInternalRequest(req: { socket: { remoteAddress?: string }; headers: Record<string, unknown> }): boolean {
    const addr = req.socket.remoteAddress ?? '';
    const loopback = addr === '::1' || addr.startsWith('127.') || addr.startsWith('::ffff:127.');
    return loopback && !req.headers['x-forwarded-for'];
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
    // req.ip is already resolved through the trusted proxies (see config/trustProxy.ts). The first
    // X-Forwarded-For entry is whatever the client typed, so it must not be used directly.
    return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Rate limiter for authentication endpoints
 * Development: 100 requests per 15 minutes per IP address
 * Production: 5 requests per 15 minutes per IP address
 * Applied to: /api/auth/* endpoints
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 100 : 10, // More lenient in development
    store: makeStore('rl:auth:'),
    passOnStoreError: true, // Redis down => skip limiting, don't 500 the request
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req, res) => {
        // Log rate limit violation with client IP
        metricsCollector.recordRateLimitViolation({
            endpoint: req.path,
            clientIp: getClientIp(req),
            timestamp: new Date().toISOString(),
            limit: 5,
            windowMs: 900000
        });

        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many authentication attempts, please try again later',
                details: {
                    retryAfter: 900, // 15 minutes in seconds
                    limit: 5,
                    windowMs: 900000
                },
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
});

// One dashboard session fires a burst of calls, and a whole office shares one
// IP, so 300/15min tripped quickly. Overridable via GENERAL_RATE_LIMIT.
const GENERAL_LIMIT = parseInt(process.env.GENERAL_RATE_LIMIT || '', 10) || (process.env.NODE_ENV === 'development' ? 2000 : 1500);

/**
 * Rate limiter for general API endpoints.
 * Development stays high so the dashboard can load. Production defaults to 1500 per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: GENERAL_LIMIT,
    store: makeStore('rl:general:'),
    passOnStoreError: true,
    skip: isInternalRequest, // server-side page renders; see isInternalRequest
    message: 'Too many requests, please try again later',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req, res) => {
        // Log rate limit violation with client IP
        metricsCollector.recordRateLimitViolation({
            endpoint: req.path,
            clientIp: getClientIp(req),
            timestamp: new Date().toISOString(),
            limit: GENERAL_LIMIT,
            windowMs: 900000
        });

        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later',
                details: {
                    retryAfter: 900, // 15 minutes in seconds
                    limit: GENERAL_LIMIT,
                    windowMs: 900000
                },
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
});
