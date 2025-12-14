/**
 * Monitoring and metrics dashboard controller
 */

import { Request, Response } from 'express';
import { metricsCollector } from '../../utils/metrics';
import { HTTP_STATUS } from '../../utils/httpStatusCodes';

/**
 * Get API metrics dashboard
 * GET /api/monitoring/dashboard
 */
export const getDashboard = (req: Request, res: Response): void => {
    try {
        // Get time window from query params (default: 15 minutes)
        const windowMinutes = parseInt(req.query.window as string) || 15;
        const windowMs = windowMinutes * 60 * 1000;

        const metrics = metricsCollector.getDashboardMetrics(windowMs);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'Metrics retrieved successfully',
            data: {
                timeWindow: `${windowMinutes} minutes`,
                metrics
            }
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to retrieve metrics',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Get health check status
 * GET /api/monitoring/health
 */
export const getHealthCheck = (req: Request, res: Response): void => {
    const metrics = metricsCollector.getDashboardMetrics(5 * 60 * 1000); // Last 5 minutes

    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
        },
        recentMetrics: {
            requests: metrics.summary.totalRequests,
            errorRate: metrics.summary.errorRate,
            avgResponseTime: metrics.summary.averageResponseTime
        }
    };

    // Determine health status based on metrics
    const errorRateNum = parseFloat(metrics.summary.errorRate);
    if (errorRateNum > 10) {
        health.status = 'degraded';
    }
    if (errorRateNum > 25) {
        health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy'
        ? HTTP_STATUS.OK
        : HTTP_STATUS.SERVICE_UNAVAILABLE;

    res.status(statusCode).json(health);
};
