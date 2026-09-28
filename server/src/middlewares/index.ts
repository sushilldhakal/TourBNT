/**
 * Centralized middleware exports
 * Import middleware from this file for consistency
 */

// Rate limiting
export { authLimiter, generalLimiter } from './rateLimiter';

// Pagination
export { paginationMiddleware } from './pagination';
export type { PaginationParams } from './pagination';

// Filtering and sorting
export { filterSortMiddleware } from './filterSort';
export type { FilterParams, SortParams } from './filterSort';

// View tracking
export { simpleViewTracking } from './viewTracking';
export type { ViewTrackableResource } from './viewTracking';

// Authentication (existing)
export { authenticate, authorizeRoles } from './authenticate';
export type { Request
 } from './authenticate';

// Error handling (existing)
// Error handlers are now exported from utils/apiResponse
export { errorHandler, notFoundHandler } from '../utils/apiResponse';

// Multer (existing)
export * from './multer';
