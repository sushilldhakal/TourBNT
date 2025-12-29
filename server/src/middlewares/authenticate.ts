import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { JwtPayload, verify, sign, decode } from "jsonwebtoken";
import { config } from "../config/config";
import { HTTP_STATUS } from "../utils/apiResponse";
import { AuthUser } from "../types/express";
import { COOKIE_NAMES, COOKIE_DURATIONS, getAuthCookieOptions } from "../utils/cookieUtils";

/**
 * Authentication middleware with sliding session
 * Verifies JWT token and attaches normalized user information to request
 * Automatically extends session tokens for active users
 * Handles expired tokens with grace period for active users
 */
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[COOKIE_NAMES.AUTH_TOKEN]; // <-- Read HTTP-only cookie
  if (!token) {
    return next(createHttpError(401, 'Authorization token is required.'));
  }

  try {
    // First, try to verify the token (will throw if expired or invalid)
    let decoded: JwtPayload & { keepMeSignedIn?: boolean };
    let isExpired = false;

    try {
      decoded = verify(token, config.jwtSecret) as JwtPayload & { keepMeSignedIn?: boolean };
    } catch (verifyError: any) {
      // Only handle TokenExpiredError - other errors mean the token is invalid
      if (verifyError.name === 'TokenExpiredError') {
        try {
          // Verify signature even for expired tokens (ignore expiration check)
          // This ensures the token was originally valid, just expired
          decoded = verify(token, config.jwtSecret, { ignoreExpiration: true }) as JwtPayload & { keepMeSignedIn?: boolean };
          
          // Validate that decoded token has required fields
          if (!decoded || !decoded.sub) {
            return next(createHttpError(401, 'Token expired or invalid.'));
          }
          
          isExpired = true;
        } catch (signatureError) {
          // Token signature is invalid (not just expired)
          return next(createHttpError(401, 'Token expired or invalid.'));
        }
      } else {
        // Other verification errors (invalid signature, malformed token, etc.)
        return next(createHttpError(401, 'Token expired or invalid.'));
      }
    }

    // Validate that decoded token has required fields
    if (!decoded || !decoded.sub) {
      return next(createHttpError(401, 'Token expired or invalid.'));
    }

    const keepMeSignedIn = decoded.keepMeSignedIn === true;
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const expirationTime = decoded.exp; // Token expiration in seconds
    
    // If token doesn't have expiration, it's invalid
    if (!expirationTime || typeof expirationTime !== 'number') {
      return next(createHttpError(401, 'Token expired or invalid.'));
    }
    
    const timeUntilExpiry = expirationTime - currentTime; // Seconds until expiry (negative if expired)

    // Grace period for expired tokens: allow refresh if expired within last 5 minutes (for active users)
    const GRACE_PERIOD_SECONDS = 5 * 60; // 5 minutes
    const isWithinGracePeriod = isExpired && timeUntilExpiry >= -GRACE_PERIOD_SECONDS;

    // Determine extension thresholds (extend when less than 50% of session time remains)
    // For 2h sessions: extend if expires within 1 hour (50% of 2h)
    // For 30d sessions: extend if expires within 15 days (50% of 30d)
    const extensionThreshold = keepMeSignedIn 
      ? 15 * 24 * 60 * 60  // 15 days for 30d sessions (50% threshold)
      : 60 * 60;            // 1 hour for 2h sessions (50% threshold)

    // Extend token if:
    // 1. It's close to expiring (within 50% of session time) OR
    // 2. It's expired but within grace period (user is active)
    const shouldExtend = (timeUntilExpiry > 0 && timeUntilExpiry <= extensionThreshold) || isWithinGracePeriod;

    if (shouldExtend) {
      const expiresIn = keepMeSignedIn ? '30d' : '2h';
      const maxAge = keepMeSignedIn ? COOKIE_DURATIONS.LONG_SESSION : COOKIE_DURATIONS.SHORT_SESSION;

      // Create new token with extended expiration
      const newToken = sign(
        {
          sub: decoded.sub,
          roles: decoded.roles || [],
          keepMeSignedIn: keepMeSignedIn,
        },
        config.jwtSecret,
        { expiresIn }
      );

      // Set the new token with extended expiration
      const cookieOptions = getAuthCookieOptions(maxAge);
      res.cookie(COOKIE_NAMES.AUTH_TOKEN, newToken, cookieOptions);
    } else if (isExpired) {
      // Token is expired and beyond grace period
      return next(createHttpError(401, 'Token expired. Please log in again.'));
    }

    // Attach user info to request
    req.user = {
      id: decoded.sub as string,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles as string],
      keepMeSignedIn: keepMeSignedIn, // Preserve keepMeSignedIn from JWT
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