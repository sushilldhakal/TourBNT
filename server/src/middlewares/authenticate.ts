import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { JwtPayload, verify } from "jsonwebtoken";
import { config } from "../config/config";
import { canAccessDashboard, isAdmin as checkIsAdmin, isSeller as checkIsSeller } from "../utils/roles";

// Define a user interface that matches the structure of your user data
interface User {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: any; // For any additional properties
}

export interface AuthRequest extends Request {
  userId: string;
  roles: string | string[];
  user?: User; // Add user property
}

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header("Authorization");
  if (!token) {
    return next(createHttpError(401, "Authorization token is required."));
  }

  try {
    const parsedToken = token.split(" ")[1];
    const decoded = verify(parsedToken, config.jwtSecret as string) as JwtPayload;
    const _req = req as AuthRequest;
    _req.userId = decoded.sub as string;
    _req.roles = decoded.roles as string;

    // Set the user object with at least the _id
    _req.user = {
      _id: decoded.sub as string,
      role: decoded.roles as string
    };

    next();
  } catch (err) {
    return next(createHttpError(401, "Token expired."));
  }
};

const isAdminOrSeller = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Use centralized role checking
  if (canAccessDashboard(req.roles)) {
    next();
  } else {
    next(createHttpError(403, 'Access forbidden: Dashboard access required'));
  }
};

const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Use centralized admin check
  if (checkIsAdmin(req.roles)) {
    next();
  } else {
    next(createHttpError(403, 'Access forbidden: Admin only'));
  }
};

const isSeller = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Use centralized seller check
  if (checkIsSeller(req.roles)) {
    next();
  } else {
    next(createHttpError(403, 'Access forbidden: Sellers only'));
  }
};

export { authenticate, isAdminOrSeller, isAdmin, isSeller };