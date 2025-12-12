import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async handler wrapper to catch errors in async route handlers
 * Supports custom request types (like AuthRequest)
 */
export const asyncHandler = <T = Request>(
    fn: (req: T, res: Response, next: NextFunction) => Promise<any> | any
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req as T, res, next)).catch(next);
    };
};

/**
 * Wrapper for protected routes with multiple middleware
 */
export const protectedRoute = (...handlers: RequestHandler[]) => {
    return handlers.map(handler => asyncHandler(handler));
};
