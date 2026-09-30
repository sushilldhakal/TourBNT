import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
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
        sendCommand: (...args: string[]) => (getRedisClient() as any).call(...args),
    });

/**
 * Get client IP address from request
 */
function getClientIp(req: any): string {
    return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        req.socket.remoteAddress ||
        'unknown'
    );
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
