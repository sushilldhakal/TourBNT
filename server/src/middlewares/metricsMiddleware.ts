/**
 * Middleware to collect API metrics for monitoring and analytics
 */

import { Request, Response, NextFunction } from 'express';
import { metricsCollector } from '../utils/metrics';

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
    // req.ip is already resolved through the trusted proxies (see config/trustProxy.ts). The first
    // X-Forwarded-For entry is whatever the client typed, so it must not be used directly.
    return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Get user ID from request if authenticated
 */
function getUserId(req: Request): string | undefined {
    // Set by the authenticate middleware.
    return req.user?.id;
}

/**
 * Middleware to track request metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const clientIp = getClientIp(req);

    // Capture the original end function
    const originalEnd = res.end;

    // Override res.end to capture metrics when response is sent
    const endWithMetrics = function (this: Response, ...args: unknown[]): Response {
        const responseTime = Date.now() - startTime;
        const userId = getUserId(req);

        // Record the request metrics
        metricsCollector.recordRequest({
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            timestamp: new Date().toISOString(),
            clientIp,
            userId
        });

        // Record error metrics if status code indicates error
        if (res.statusCode >= 400) {
            metricsCollector.recordError({
                endpoint: req.path,
                method: req.method,
                statusCode: res.statusCode,
                errorMessage: `HTTP ${res.statusCode}`,
                timestamp: new Date().toISOString(),
                clientIp,
                userId
            });
        }

        // Call the original end function with the same arguments (it has several overloads).
        return (originalEnd as (...endArgs: unknown[]) => Response).apply(this, args);
    };
    res.end = endWithMetrics as Response['end'];

    next();
};
