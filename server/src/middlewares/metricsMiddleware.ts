/**
 * Middleware to collect API metrics for monitoring and analytics
 */

import { Request, Response, NextFunction } from 'express';
import { metricsCollector } from '../utils/metrics';

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
    return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        req.socket.remoteAddress ||
        'unknown'
    );
}

/**
 * Get user ID from request if authenticated
 */
function getUserId(req: Request): string | undefined {
    // Assuming user is attached to request by auth middleware
    return (req as any).user?.id || (req as any).user?._id?.toString();
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
    res.end = function (this: Response, ...args: any[]): Response {
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
                errorMessage: (res as any).errorMessage || `HTTP ${res.statusCode}`,
                timestamp: new Date().toISOString(),
                clientIp,
                userId
            });
        }

        // Call the original end function with proper arguments
        // @ts-ignore - Complex overload signature
        return originalEnd.apply(this, args);
    };

    next();
};
