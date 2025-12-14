import { Request, Response, NextFunction } from 'express';

/**
 * Resource types that support view tracking
 */
export type ViewTrackableResource = 'tour' | 'review' | 'post';

/**
 * View tracking service interface
 * Implement this interface in your service layer
 */
export interface ViewTrackingService {
    trackTourView(tourId: string): Promise<void>;
    trackReviewView(reviewId: string): Promise<void>;
    trackPostView(postId: string): Promise<void>;
}

import { logger as appLogger } from '../utils/logger';

/**
 * Logger interface for view tracking errors
 */
interface Logger {
    error(message: string, meta?: any): void;
}

// Use the application logger
const defaultLogger: Logger = {
    error: (message: string, meta?: any) => {
        appLogger.error(message, meta);
    }
};

/**
 * Create view tracking middleware
 * Automatically increments view count for resources when they are retrieved via GET
 * 
 * @param resourceType - Type of resource being tracked ('tour', 'review', 'post')
 * @param paramName - Name of the route parameter containing the resource ID (default: 'id')
 * @param service - View tracking service implementation
 * @param logger - Optional logger for error tracking
 * @returns Express middleware function
 * 
 * Usage:
 * router.get('/tours/:tourId', 
 *   viewTrackingMiddleware('tour', 'tourId', viewTrackingService),
 *   getTour
 * );
 */
export const viewTrackingMiddleware = (
    resourceType: ViewTrackableResource,
    paramName: string = 'id',
    service: ViewTrackingService,
    logger: Logger = defaultLogger
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const resourceId = req.params[paramName];

        if (!resourceId) {
            // If no resource ID, just continue without tracking
            next();
            return;
        }

        // Track view asynchronously, don't block the response
        // This ensures view tracking failures don't prevent the main operation
        setImmediate(async () => {
            try {
                switch (resourceType) {
                    case 'tour':
                        await service.trackTourView(resourceId);
                        break;
                    case 'review':
                        await service.trackReviewView(resourceId);
                        break;
                    case 'post':
                        await service.trackPostView(resourceId);
                        break;
                }
            } catch (error) {
                // Log the error but don't fail the request
                logger.error('View tracking failed', {
                    resourceType,
                    resourceId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Continue with the request immediately
        next();
    };
};

/**
 * Simple view tracking middleware without service injection
 * Uses a callback function to handle view tracking
 * 
 * @param resourceType - Type of resource being tracked
 * @param paramName - Name of the route parameter containing the resource ID
 * @param trackFn - Async function to track the view
 * @param logger - Optional logger for error tracking
 * @returns Express middleware function
 * 
 * Usage:
 * router.get('/tours/:tourId',
 *   simpleViewTracking('tour', 'tourId', async (id) => {
 *     await Tour.findByIdAndUpdate(id, { $inc: { views: 1 } });
 *   }),
 *   getTour
 * );
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
