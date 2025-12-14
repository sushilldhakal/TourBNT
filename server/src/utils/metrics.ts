/**
 * API Metrics Collection and Monitoring
 * Tracks API usage, performance, and error rates
 */

import { logger } from './logger';

export interface RequestMetrics {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    timestamp: string;
    clientIp?: string;
    userId?: string;
}

export interface RateLimitViolation {
    endpoint: string;
    clientIp: string;
    timestamp: string;
    limit: number;
    windowMs: number;
}

export interface ErrorMetrics {
    endpoint: string;
    method: string;
    statusCode: number;
    errorMessage: string;
    timestamp: string;
    clientIp?: string;
    userId?: string;
}

class MetricsCollector {
    private requestMetrics: RequestMetrics[] = [];
    private rateLimitViolations: RateLimitViolation[] = [];
    private errorMetrics: ErrorMetrics[] = [];

    // Thresholds for alerts
    private readonly RATE_LIMIT_ALERT_THRESHOLD = 10; // Alert after 10 violations in window
    private readonly ERROR_RATE_ALERT_THRESHOLD = 0.1; // Alert if error rate > 10%
    private readonly SLOW_REQUEST_THRESHOLD = 5000; // Alert if request takes > 5 seconds

    // Time windows for metrics (in milliseconds)
    private readonly METRICS_RETENTION_WINDOW = 60 * 60 * 1000; // 1 hour
    private readonly ALERT_CHECK_WINDOW = 15 * 60 * 1000; // 15 minutes

    constructor() {
        // Clean up old metrics every 5 minutes
        setInterval(() => this.cleanupOldMetrics(), 5 * 60 * 1000);
    }

    /**
     * Record a request metric
     */
    recordRequest(metrics: RequestMetrics): void {
        this.requestMetrics.push(metrics);

        // Check for slow requests
        if (metrics.responseTime > this.SLOW_REQUEST_THRESHOLD) {
            logger.warn('Slow request detected', {
                endpoint: metrics.endpoint,
                method: metrics.method,
                responseTime: metrics.responseTime,
                clientIp: metrics.clientIp
            });
        }

        // Check error rate periodically
        this.checkErrorRate();
    }

    /**
     * Record a rate limit violation
     */
    recordRateLimitViolation(violation: RateLimitViolation): void {
        this.rateLimitViolations.push(violation);

        // Log the violation with client IP
        logger.warn('Rate limit violation', {
            endpoint: violation.endpoint,
            clientIp: violation.clientIp,
            limit: violation.limit,
            windowMs: violation.windowMs
        });

        // Check if we need to alert
        this.checkRateLimitAlerts();
    }

    /**
     * Record an error metric
     */
    recordError(error: ErrorMetrics): void {
        this.errorMetrics.push(error);

        logger.error('API error occurred', {
            endpoint: error.endpoint,
            method: error.method,
            statusCode: error.statusCode,
            errorMessage: error.errorMessage,
            clientIp: error.clientIp,
            userId: error.userId
        });
    }

    /**
     * Check for high rate limit violations and alert
     */
    private checkRateLimitAlerts(): void {
        const now = Date.now();
        const recentViolations = this.rateLimitViolations.filter(
            v => now - new Date(v.timestamp).getTime() < this.ALERT_CHECK_WINDOW
        );

        if (recentViolations.length >= this.RATE_LIMIT_ALERT_THRESHOLD) {
            // Group by IP to identify potential attackers
            const violationsByIp = this.groupByIp(recentViolations);

            for (const [ip, violations] of Object.entries(violationsByIp)) {
                if (violations.length >= 5) {
                    logger.error('HIGH RATE LIMIT VIOLATIONS DETECTED', {
                        alert: 'RATE_LIMIT_ABUSE',
                        clientIp: ip,
                        violationCount: violations.length,
                        timeWindow: `${this.ALERT_CHECK_WINDOW / 60000} minutes`,
                        endpoints: violations.map(v => v.endpoint)
                    });
                }
            }
        }
    }

    /**
     * Check error rate and alert if threshold exceeded
     */
    private checkErrorRate(): void {
        const now = Date.now();
        const recentRequests = this.requestMetrics.filter(
            r => now - new Date(r.timestamp).getTime() < this.ALERT_CHECK_WINDOW
        );

        if (recentRequests.length < 10) {
            // Not enough data to calculate meaningful error rate
            return;
        }

        const errorRequests = recentRequests.filter(r => r.statusCode >= 500);
        const errorRate = errorRequests.length / recentRequests.length;

        if (errorRate > this.ERROR_RATE_ALERT_THRESHOLD) {
            logger.error('HIGH ERROR RATE DETECTED', {
                alert: 'HIGH_ERROR_RATE',
                errorRate: `${(errorRate * 100).toFixed(2)}%`,
                totalRequests: recentRequests.length,
                errorRequests: errorRequests.length,
                timeWindow: `${this.ALERT_CHECK_WINDOW / 60000} minutes`
            });
        }
    }

    /**
     * Group violations by IP address
     */
    private groupByIp(violations: RateLimitViolation[]): Record<string, RateLimitViolation[]> {
        return violations.reduce((acc, violation) => {
            if (!acc[violation.clientIp]) {
                acc[violation.clientIp] = [];
            }
            acc[violation.clientIp].push(violation);
            return acc;
        }, {} as Record<string, RateLimitViolation[]>);
    }

    /**
     * Clean up old metrics to prevent memory leaks
     */
    private cleanupOldMetrics(): void {
        const now = Date.now();
        const cutoff = now - this.METRICS_RETENTION_WINDOW;

        this.requestMetrics = this.requestMetrics.filter(
            m => new Date(m.timestamp).getTime() > cutoff
        );
        this.rateLimitViolations = this.rateLimitViolations.filter(
            v => new Date(v.timestamp).getTime() > cutoff
        );
        this.errorMetrics = this.errorMetrics.filter(
            e => new Date(e.timestamp).getTime() > cutoff
        );

        logger.debug('Metrics cleanup completed', {
            requestMetrics: this.requestMetrics.length,
            rateLimitViolations: this.rateLimitViolations.length,
            errorMetrics: this.errorMetrics.length
        });
    }

    /**
     * Get dashboard metrics for the specified time window
     */
    getDashboardMetrics(windowMs: number = this.ALERT_CHECK_WINDOW): {
        summary: {
            totalRequests: number;
            successfulRequests: number;
            failedRequests: number;
            errorRate: string;
            averageResponseTime: number;
            rateLimitViolations: number;
        };
        topEndpoints: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
        errorsByEndpoint: Array<{ endpoint: string; count: number; errors: string[] }>;
        rateLimitViolationsByIp: Array<{ ip: string; count: number; endpoints: string[] }>;
        slowestEndpoints: Array<{ endpoint: string; method: string; responseTime: number }>;
    } {
        const now = Date.now();
        const recentRequests = this.requestMetrics.filter(
            r => now - new Date(r.timestamp).getTime() < windowMs
        );
        const recentViolations = this.rateLimitViolations.filter(
            v => now - new Date(v.timestamp).getTime() < windowMs
        );
        const recentErrors = this.errorMetrics.filter(
            e => now - new Date(e.timestamp).getTime() < windowMs
        );

        // Calculate summary
        const totalRequests = recentRequests.length;
        const successfulRequests = recentRequests.filter(r => r.statusCode < 400).length;
        const failedRequests = totalRequests - successfulRequests;
        const errorRate = totalRequests > 0
            ? `${((failedRequests / totalRequests) * 100).toFixed(2)}%`
            : '0%';
        const averageResponseTime = totalRequests > 0
            ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests
            : 0;

        // Top endpoints by request count
        const endpointCounts = this.groupAndCountEndpoints(recentRequests);
        const topEndpoints = Object.entries(endpointCounts)
            .map(([endpoint, requests]) => ({
                endpoint,
                count: requests.length,
                avgResponseTime: requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Errors by endpoint
        const errorsByEndpoint = this.groupErrorsByEndpoint(recentErrors);

        // Rate limit violations by IP
        const violationsByIp = this.groupByIp(recentViolations);
        const rateLimitViolationsByIp = Object.entries(violationsByIp)
            .map(([ip, violations]) => ({
                ip,
                count: violations.length,
                endpoints: [...new Set(violations.map(v => v.endpoint))]
            }))
            .sort((a, b) => b.count - a.count);

        // Slowest endpoints
        const slowestEndpoints = [...recentRequests]
            .sort((a, b) => b.responseTime - a.responseTime)
            .slice(0, 10)
            .map(r => ({
                endpoint: r.endpoint,
                method: r.method,
                responseTime: r.responseTime
            }));

        return {
            summary: {
                totalRequests,
                successfulRequests,
                failedRequests,
                errorRate,
                averageResponseTime: Math.round(averageResponseTime),
                rateLimitViolations: recentViolations.length
            },
            topEndpoints,
            errorsByEndpoint,
            rateLimitViolationsByIp,
            slowestEndpoints
        };
    }

    /**
     * Group requests by endpoint
     */
    private groupAndCountEndpoints(requests: RequestMetrics[]): Record<string, RequestMetrics[]> {
        return requests.reduce((acc, request) => {
            const key = `${request.method} ${request.endpoint}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(request);
            return acc;
        }, {} as Record<string, RequestMetrics[]>);
    }

    /**
     * Group errors by endpoint
     */
    private groupErrorsByEndpoint(errors: ErrorMetrics[]): Array<{ endpoint: string; count: number; errors: string[] }> {
        const grouped = errors.reduce((acc, error) => {
            const key = `${error.method} ${error.endpoint}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(error.errorMessage);
            return acc;
        }, {} as Record<string, string[]>);

        return Object.entries(grouped)
            .map(([endpoint, errors]) => ({
                endpoint,
                count: errors.length,
                errors: [...new Set(errors)] // Unique error messages
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
