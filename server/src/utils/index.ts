/**
 * Centralized utility exports
 */

// Error response utilities
export {
    sendErrorResponse,
    sendValidationError,
    sendAuthenticationError,
    sendAuthorizationError,
    sendNotFoundError,
    sendConflictError,
    sendRateLimitError,
    sendInternalServerError,
    ErrorCode
} from './errorResponse';
export type { ErrorResponse } from './errorResponse';

// Route wrapper (existing)
export { asyncAuthHandler } from './routeWrapper';
