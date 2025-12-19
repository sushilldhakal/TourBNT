import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { JwtPayload, verify } from "jsonwebtoken";
import { config } from "../config/config";
import { HTTP_STATUS } from "../utils/httpStatusCodes";
import { AuthUser } from "../types/express";
import { COOKIE_NAMES } from "../utils/cookieUtils";

/**
 * Authentication middleware
 * Verifies JWT token and attaches normalized user information to request
 */
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[COOKIE_NAMES.AUTH_TOKEN]; // <-- Read HTTP-only cookie
  if (!token) {
    return next(createHttpError(401, 'Authorization token is required.'));
  }

  try {
    const decoded = verify(token, config.jwtSecret) as JwtPayload;

    req.user = {
      id: decoded.sub as string,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles as string],
    };

    next();
  } catch (err) {
    return next(createHttpError(401, 'Token expired or invalid.'));
  }

};


export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(createHttpError(401, 'Not authenticated'));

    const roles = req.user.roles.map(role => role.toLowerCase());
    const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
    const hasRole = roles.some(role => normalizedAllowedRoles.includes(role));

    if (!hasRole) return next(createHttpError(403, 'Forbidden'));

    next();
  };
};

export const requireOwnerOrAdmin = (
  getOwnerId: (req: Request) => string | undefined
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return next(
        createHttpError(HTTP_STATUS.UNAUTHORIZED, "Authentication required")
      );
    }

    const ownerId = getOwnerId(req);
    const isOwner = req.user.id === ownerId;
    const isAdmin = req.user.roles.includes('admin');

    if (isOwner || isAdmin) {
      return next();
    }

    return next(
      createHttpError(
        HTTP_STATUS.FORBIDDEN,
        "Access forbidden: Must be resource owner or admin"
      )
    );
  };
};


export { authenticate, Request, AuthUser };