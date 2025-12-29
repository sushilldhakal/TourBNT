import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '../utils/apiResponse';
import { metricsCollector } from '../utils/metrics';

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

/**
 * Rate limiter for general API endpoints
 * Limits: 100 requests per 15 minutes per IP address
 * Applied to: General API endpoints
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (req, res) => {
        // Log rate limit violation with client IP
        metricsCollector.recordRateLimitViolation({
            endpoint: req.path,
            clientIp: getClientIp(req),
            timestamp: new Date().toISOString(),
            limit: 100,
            windowMs: 900000
        });

        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later',
                details: {
                    retryAfter: 900, // 15 minutes in seconds
                    limit: 100,
                    windowMs: 900000
                },
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
});
