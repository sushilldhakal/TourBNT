/**
 * Centralized utility exports
 */

// API Response utilities (unified)
export {
    HTTP_STATUS,
    sendSuccess,
    sendError,
    sendPaginatedResponse,
    sendValidationError,
    sendAuthError,
    sendForbiddenError,
    sendNotFoundError,
    sendConflictError,
    errorHandler,
    notFoundHandler,
    handleResourceNotFound,
    handleUnauthorized,
    handleForbidden,
    handleValidationErrors,
    handleDuplicateResource,
    handleInvalidId,
    handleMissingFields
} from './apiResponse';
export type { ErrorCode, ValidationError, PaginationMeta } from './apiResponse';

// Route wrapper (existing)
export { asyncAuthHandler } from './routeWrapper';

