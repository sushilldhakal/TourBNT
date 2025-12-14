/**
 * HTTP Status Codes Constants
 * Centralized status codes for consistent usage across the API
 */

export const HTTP_STATUS = {
    // Success codes
    OK: 200,                    // Successful GET, PATCH requests
    CREATED: 201,               // Successful POST (resource creation)
    NO_CONTENT: 204,            // Successful DELETE (no response body)

    // Client error codes
    BAD_REQUEST: 400,           // Validation errors, malformed requests
    UNAUTHORIZED: 401,          // Authentication required or failed
    FORBIDDEN: 403,             // Authenticated but not authorized
    NOT_FOUND: 404,             // Resource not found
    CONFLICT: 409,              // Duplicate resource (e.g., email already exists)
    UNPROCESSABLE_ENTITY: 422,  // Semantic validation errors
    TOO_MANY_REQUESTS: 429,     // Rate limit exceeded

    // Server error codes
    INTERNAL_SERVER_ERROR: 500, // Unexpected server errors
    SERVICE_UNAVAILABLE: 503    // Service temporarily unavailable
} as const;

/**
 * Error response structure
 */
export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
        path: string;
    };
}

/**
 * Success response structure
 */
export interface SuccessResponse<T = any> {
    success?: boolean;
    message?: string;
    data?: T;
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}
