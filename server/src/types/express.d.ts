import { Breadcrumb } from '../middlewares/breadcrumbsMiddleware';
import { Multer } from 'multer';

declare global {
  namespace Express {
    interface Request {
      breadcrumbs?: Breadcrumb[];
      file?: Multer.File;
      files?: Record<string, Multer.File[]>;
    }
  }
}

// This export makes the file a module, which is required for declaration merging
export { };
