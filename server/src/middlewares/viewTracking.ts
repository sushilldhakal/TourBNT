import { Request, Response, NextFunction } from 'express';
import { logger as appLogger } from '../utils/logger';

/**
 * Resource types that support view tracking
 */
export type ViewTrackableResource = 'tour' | 'review' | 'post';

/**
 * Logger interface for view tracking errors
 */
interface Logger {
    error(message: string, meta?: Record<string, unknown>): void;
}

// Use the application logger
const defaultLogger: Logger = {
    error: (message: string, meta?: Record<string, unknown>) => {
        appLogger.error(message, meta);
    }
};

/**
 * Increments a view count after the response continues.
 * The callback owns the database write.
 */
export const simpleViewTracking = (
    resourceType: ViewTrackableResource,
    paramName: string = 'id',
    trackFn: (resourceId: string) => Promise<void>,
    logger: Logger = defaultLogger
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const resourceId = req.params[paramName];

        if (!resourceId) {
            next();
            return;
        }

        // Track view asynchronously
        setImmediate(async () => {
            try {
                await trackFn(resourceId);
            } catch (error) {
                logger.error('View tracking failed', {
                    resourceType,
                    resourceId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        next();
    };
};
