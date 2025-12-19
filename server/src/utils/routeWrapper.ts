import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async handler wrapper to catch errors in async route handlers
 * Supports custom request types (like Request
)
 */

export const asyncAuthHandler = (
    fn: (req: Request
, res: Response, next: NextFunction) => any
): RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(fn(req as Request
, res, next)).catch(next);
    };
};

/**
 * Wrapper for protected routes with multiple middleware
 */
export const protectedRoute = (...handlers: RequestHandler[]) => {
    return handlers.map(handler => asyncAuthHandler(handler));
};
