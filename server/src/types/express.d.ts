import { Multer } from 'multer';
import { Request } from "express";
import { PgUser } from "../api/user/userRepo.pg";
/**
 * Authenticated user information
 * Single source of truth for user identity and roles
 */
export interface AuthUser {
  id: string;
  roles: string[];
  keepMeSignedIn?: boolean; // Preserved from JWT to maintain session duration preference
}


declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      // Full row already fetched by `authenticate` while verifying the session —
      // reuse this instead of re-querying the same user by id.
      authAccount?: PgUser;
      file?: Multer.File;
      files?: Record<string, Multer.File[]>;
      // Pagination middleware
      pagination?: {
        page: number;
        limit: number | 'all';
        skip: number;
        useHybrid: boolean; // Flag to indicate if hybrid pagination should be used
      };
      // Filter/sort middleware
      filters?: Record<string, any>;
      sort?: {
        field: string;
        order: 'asc' | 'desc';
      };
    }
  }
}

// This export makes the file a module, which is required for declaration merging
export { };
