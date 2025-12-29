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

// Document normalization utility (consolidated)
export {
    normalizeDoc,
    normalizeForApi,
    normalizeDeepNested,
    normalizeUserWithSellerInfo,
    normalizeTourWithReferences,
    normalizeBookingWithReferences,
    normalizeWithModelTransforms,
    batchNormalizeWithModels,
    getModelTransforms,
    commonTransforms,
    modelTransforms,
    commonNestedConfigs,
    getNormalizationCacheStats,
    clearNormalizationCache,
    getMemoryUsage,
    PerformanceMonitoringService,
    performanceMonitor,
    enablePerformanceMonitoring,
    performanceMonitoringMiddleware
} from './normalizeDoc';
export type { 
    NormalizeOptions, 
    ApiNormalizeOptions,
    NestedNormalizationConfig,
    DeepNormalizationConfig
} from './normalizeDoc';

// Data integrity validation utilities
export {
    validateDataIntegrity,
    validateMongooseFieldsRemoved,
    validateIdConsistency,
    NormalizationPerformanceMonitor
} from './dataIntegrityValidator';
