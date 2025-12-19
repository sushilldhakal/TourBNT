import { Breadcrumb } from '../middlewares/breadcrumbsMiddleware';
import { Multer } from 'multer';
import { Request } from "express";
/**
 * Authenticated user information
 * Single source of truth for user identity and roles
 */
export interface AuthUser {
  id: string;
  roles: string[];
}


declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      breadcrumbs?: Breadcrumb[];
      file?: Multer.File;
      files?: Record<string, Multer.File[]>;
      // Pagination middleware
      pagination?: {
        page: number;
        limit: number;
        skip: number;
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
