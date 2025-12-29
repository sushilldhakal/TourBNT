/**
 * @deprecated Use paginationUtils instead
 * This file is kept for backward compatibility only
 * Import directly from './paginationUtils' for new code
 */
export { 
  paginate,
  hybridPagination,
  parsePaginationParams,
  validatePaginationParams,
  calculatePaginationMeta,
  type PaginationParams,
  type PaginationOptions,
  type HybridPaginationOptions,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER
} from './paginationUtils';