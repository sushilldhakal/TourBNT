import { Types } from 'mongoose';
import { validateDataIntegrity, NormalizationPerformanceMonitor } from './dataIntegrityValidator';

/**
 * Plain object type for normalized documents
 */
type PlainObject = Record<string, any>;

// ============================================================================
// OPTIONS & INTERFACES
// ============================================================================

/**
 * Options for document normalization
 */
export interface NormalizeOptions {
    /** Whether to remove the _id field (default: true) */
    removeId?: boolean;
    /** Whether to remove the __v version field (default: true) */
    removeVersion?: boolean;
    /** Whether to add an id field from _id (default: true) */
    addId?: boolean;
    /** Whether to validate data integrity (default: false for performance) */
    validateIntegrity?: boolean;
    /** Whether to monitor performance (default: false) */
    monitorPerformance?: boolean;
    /** Whether to use caching for repeated normalizations (default: true) */
    useCache?: boolean;
    /** Maximum array size to process without chunking (default: 1000) */
    maxArraySize?: number;
    /** Chunk size for processing large arrays (default: 100) */
    chunkSize?: number;
    /** Whether to ensure ISO-8601 timestamp format (default: false) */
    ensureIsoTimestamps?: boolean;
    /** Custom field transformations per model type */
    customTransforms?: Record<string, (value: any) => any>;
}

/**
 * Enhanced normalization options for API responses (extends NormalizeOptions)
 */
export interface ApiNormalizeOptions extends NormalizeOptions {
    /** Whether to ensure ISO-8601 timestamp format (default: true) */
    ensureIsoTimestamps?: boolean;
    /** Custom field transformations per model type */
    customTransforms?: Record<string, (value: any) => any>;
}

/**
 * Configuration for nested field normalization
 */
export interface NestedNormalizationConfig {
    /** Path to the nested field (dot notation supported) */
    path: string;
    /** Whether this field contains an array of documents */
    isArray: boolean;
    /** Model name for the nested documents */
    modelName?: string;
    /** Custom normalization options for this field */
    options?: ApiNormalizeOptions;
}

/**
 * Deep normalization configuration for complex nested structures
 */
export interface DeepNormalizationConfig {
    /** Nested field configurations */
    nestedFields: NestedNormalizationConfig[];
    /** Default options for all nested fields */
    defaultOptions?: ApiNormalizeOptions;
}

/**
 * Default normalization options
 */
const defaultOptions: NormalizeOptions = {
    addId: true,
    removeId: true,
    removeVersion: true,
    validateIntegrity: false,
    monitorPerformance: false,
    useCache: true,
    maxArraySize: 1000,
    chunkSize: 100,
    ensureIsoTimestamps: false,
};

/**
 * Default API normalization options
 */
const defaultApiOptions: ApiNormalizeOptions = {
    ...defaultOptions,
    ensureIsoTimestamps: true,
};

// ============================================================================
// CACHE & MEMORY MONITORING
// ============================================================================

/**
 * Simple LRU cache for normalized documents
 */
class NormalizationCache {
    private cache = new Map<string, any>();
    private maxSize = 500;
    private hitCount = 0;
    private missCount = 0;

    private generateKey(doc: any, options: NormalizeOptions): string {
        if (!doc || typeof doc !== 'object') return '';
        const id = doc._id?.toString() || JSON.stringify(doc).slice(0, 100);
        const optionsKey = JSON.stringify(options);
        return `${id}:${optionsKey}`;
    }

    get(doc: any, options: NormalizeOptions): any | null {
        const key = this.generateKey(doc, options);
        if (!key) return null;
        const cached = this.cache.get(key);
        if (cached) {
            this.hitCount++;
            this.cache.delete(key);
            this.cache.set(key, cached);
            return cached;
        }
        this.missCount++;
        return null;
    }

    set(doc: any, options: NormalizeOptions, normalized: any): void {
        const key = this.generateKey(doc, options);
        if (!key) return;
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(key, normalized);
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
        };
    }

    clear(): void {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
    }
}

const normalizationCache = new NormalizationCache();

/**
 * Memory usage monitor for large array processing
 */
class MemoryMonitor {
    private static readonly WARNING_THRESHOLD = 100 * 1024 * 1024; // 100MB
    private static readonly CRITICAL_THRESHOLD = 500 * 1024 * 1024; // 500MB

    static checkMemoryUsage(): { warning: boolean; critical: boolean; usage: number } {
        const usage = process.memoryUsage();
        return {
            warning: usage.heapUsed > this.WARNING_THRESHOLD,
            critical: usage.heapUsed > this.CRITICAL_THRESHOLD,
            usage: usage.heapUsed
        };
    }

    static logMemoryWarning(arraySize: number): void {
        const memory = this.checkMemoryUsage();
        if (memory.warning) {
            console.warn(`High memory usage detected during normalization of ${arraySize} items: ${(memory.usage / 1024 / 1024).toFixed(2)}MB`);
        }
    }
}

// ============================================================================
// CORE NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Ensure timestamp fields are in ISO-8601 format
 */
const normalizeTimestamps = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    const result = { ...obj };
    const timestampFields = ['createdAt', 'updatedAt', 'subscribedAt', 'appliedAt', 'approvedAt'];
    for (const field of timestampFields) {
        if (result[field]) {
            const date = new Date(result[field]);
            if (!isNaN(date.getTime())) {
                result[field] = date.toISOString();
            }
        }
    }
    return result;
};

/**
 * Apply custom field transformations
 */
const applyCustomTransforms = (obj: any, transforms: Record<string, (value: any) => any>): any => {
    if (!obj || typeof obj !== 'object' || !transforms) return obj;
    const result = { ...obj };
    for (const [field, transform] of Object.entries(transforms)) {
        if (result[field] !== undefined) {
            try {
                result[field] = transform(result[field]);
            } catch (error) {
                console.warn(`Custom transform failed for field ${field}:`, error);
            }
        }
    }
    return result;
};

/**
 * Normalize a single document with caching support
 */
const normalizeOne = (doc: any, options: NormalizeOptions): any => {
    if (!doc) return doc;

    if (options.useCache) {
        const cached = normalizationCache.get(doc, options);
        if (cached) return cached;
    }

    const obj: PlainObject = typeof doc.toObject === 'function'
        ? doc.toObject({ getters: true, virtuals: false })
        : { ...doc };

    const result: PlainObject = { ...obj };

    if (options.addId && result._id) {
        result.id = result._id instanceof Types.ObjectId
            ? result._id.toString()
            : String(result._id);
    }

    if (options.removeId) delete result._id;
    if (options.removeVersion) delete result.__v;

    if (options.useCache) {
        normalizationCache.set(doc, options, result);
    }

    return result;
};

/**
 * Process large arrays in chunks to prevent memory issues
 */
const processArrayInChunks = <T>(array: any[], options: NormalizeOptions, processor: (item: any) => T): T[] => {
    const { chunkSize = 100 } = options;
    const result: T[] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        result.push(...chunk.map(processor));
        if (i % (chunkSize * 10) === 0) {
            MemoryMonitor.logMemoryWarning(array.length);
        }
    }
    return result;
};

/**
 * Recursively normalize nested objects and arrays
 */
const normalizeNestedRecursive = (obj: any, options: ApiNormalizeOptions): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => normalizeNestedRecursive(item, options));

    const hasMongoFields = obj._id !== undefined || obj.__v !== undefined;
    if (hasMongoFields) {
        const normalized = { ...obj };
        if (options.addId && normalized._id) normalized.id = String(normalized._id);
        if (options.removeId) delete normalized._id;
        if (options.removeVersion) delete normalized.__v;
        for (const [key, value] of Object.entries(normalized)) {
            if (value && typeof value === 'object') {
                normalized[key] = normalizeNestedRecursive(value, options);
            }
        }
        return normalized;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = value && typeof value === 'object' ? normalizeNestedRecursive(value, options) : value;
    }
    return result;
};

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Normalize document(s) to plain object(s) with consistent structure
 * 
 * @example
 * const normalized = normalizeDoc(tour);
 * const normalizedArray = normalizeDoc(tours);
 */
export const normalizeDoc = <T = any>(data: any, options: NormalizeOptions = defaultOptions): T => {
    const opts = { ...defaultOptions, ...options };
    const endTiming = opts.monitorPerformance ? NormalizationPerformanceMonitor.startTiming() : null;

    try {
        if (Array.isArray(data)) {
            const arraySize = data.length;
            if (arraySize > 1000) MemoryMonitor.logMemoryWarning(arraySize);

            const processor = (item: any) => {
                const normalized = normalizeOne(item, opts);
                if (opts.validateIntegrity && process.env.NODE_ENV !== 'production') {
                    const validation = validateDataIntegrity(item, normalized);
                    if (!validation.isValid) {
                        console.warn('Data integrity validation failed:', validation.issues);
                    }
                }
                return normalized;
            };

            const result = arraySize > (opts.maxArraySize || 1000)
                ? processArrayInChunks(data, opts, processor)
                : data.map(processor);

            return result as T;
        } else {
            const normalized = normalizeOne(data, opts);
            if (opts.validateIntegrity && process.env.NODE_ENV !== 'production') {
                const validation = validateDataIntegrity(data, normalized);
                if (!validation.isValid) {
                    console.warn('Data integrity validation failed:', validation.issues);
                }
            }
            return normalized as T;
        }
    } finally {
        if (endTiming) endTiming();
    }
};

/**
 * Normalize document(s) specifically for API responses
 * Extends normalizeDoc with API-specific enhancements (timestamps, custom transforms)
 */
export const normalizeForApi = <T = any>(data: any, options: ApiNormalizeOptions = defaultApiOptions): T => {
    const opts = { ...defaultApiOptions, ...options };
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map(item => normalizeForApi(item, opts)) as T;
    }

    let result: any = typeof data.toObject === 'function'
        ? data.toObject({ getters: true, virtuals: false })
        : { ...data };

    if (opts.addId && result._id) result.id = String(result._id);
    if (opts.removeId) delete result._id;
    if (opts.removeVersion) delete result.__v;

    if (opts.ensureIsoTimestamps) result = normalizeTimestamps(result);
    if (opts.customTransforms) result = applyCustomTransforms(result, opts.customTransforms);
    result = normalizeNestedRecursive(result, opts);

    return result as T;
};

// ============================================================================
// NESTED NORMALIZATION
// ============================================================================

/**
 * Get nested value using dot notation path
 */
const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current && current[key] !== undefined ? current[key] : undefined, obj);
};

/**
 * Set nested value using dot notation path
 */
const setNestedValue = (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
        if (!current[key] || typeof current[key] !== 'object') current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
};

/**
 * Normalize deeply nested documents with specific configurations
 */
export const normalizeDeepNested = <T = any>(data: any, config: DeepNormalizationConfig): T => {
    if (!data || typeof data !== 'object') return data;
    let result = normalizeForApi(data, config.defaultOptions);
    if (Array.isArray(result)) return result.map(item => normalizeDeepNested(item, config)) as T;

    for (const fieldConfig of config.nestedFields) {
        const nestedValue = getNestedValue(result, fieldConfig.path);
        if (nestedValue !== undefined) {
            const options = { ...config.defaultOptions, ...fieldConfig.options };
            const normalizedNested = fieldConfig.isArray && Array.isArray(nestedValue)
                ? nestedValue.map(item => normalizeForApi(item, options))
                : normalizeForApi(nestedValue, options);
            setNestedValue(result, fieldConfig.path, normalizedNested);
        }
    }
    return result as T;
};

/**
 * Pre-configured normalization for common nested structures
 */
export const commonNestedConfigs = {
    userWithSellerInfo: {
        nestedFields: [
            { path: 'sellerInfo', isArray: false },
            { path: 'sellerInfo.bankDetails', isArray: false },
            { path: 'sellerInfo.businessAddress', isArray: false },
            { path: 'sellerInfo.destination', isArray: true },
            { path: 'sellerInfo.category', isArray: true }
        ]
    } as DeepNormalizationConfig,
    tourWithReferences: {
        nestedFields: [
            { path: 'guides', isArray: true },
            { path: 'reviews', isArray: true },
            { path: 'bookings', isArray: true }
        ]
    } as DeepNormalizationConfig,
    bookingWithReferences: {
        nestedFields: [
            { path: 'user', isArray: false },
            { path: 'tour', isArray: false }
        ]
    } as DeepNormalizationConfig
};

/**
 * Convenience functions for common nested structures
 */
export const normalizeUserWithSellerInfo = <T = any>(data: any): T => normalizeDeepNested<T>(data, commonNestedConfigs.userWithSellerInfo);
export const normalizeTourWithReferences = <T = any>(data: any): T => normalizeDeepNested<T>(data, commonNestedConfigs.tourWithReferences);
export const normalizeBookingWithReferences = <T = any>(data: any): T => normalizeDeepNested<T>(data, commonNestedConfigs.bookingWithReferences);

// ============================================================================
// MODEL TRANSFORMS
// ============================================================================

/**
 * Pre-defined custom transformations for common use cases
 */
export const commonTransforms = {
    phone: (value: any): string => value ? String(value).replace(/[^\d+]/g, '') : value,
    email: (value: any): string => value ? String(value).toLowerCase().trim() : value,
    boolean: (value: any): boolean => typeof value === 'boolean' ? value : String(value).toLowerCase() === 'true',
    objectIdToString: (value: any): string => value ? String(value) : value,
    objectIdArrayToString: (value: any[]): string[] => Array.isArray(value) ? value.map(item => String(item)) : value
};

/**
 * Model-specific transformation configurations
 */
export const modelTransforms: Record<string, Record<string, (value: any) => any>> = {
    User: { email: commonTransforms.email, phone: commonTransforms.phone, verified: commonTransforms.boolean },
    Tour: { price: (v: any) => parseFloat(v) || 0, duration: (v: any) => parseInt(v) || 0, maxGroupSize: (v: any) => parseInt(v) || 0 },
    Booking: { totalPrice: (v: any) => parseFloat(v) || 0, participants: (v: any) => parseInt(v) || 1 }
};

/**
 * Get custom transformations for a specific model
 */
export const getModelTransforms = (modelName: string): Record<string, (value: any) => any> => {
    return modelTransforms[modelName] || {};
};

/**
 * Normalize document with model-specific transformations
 */
export const normalizeWithModelTransforms = <T = any>(data: any, modelName: string, options: ApiNormalizeOptions = {}): T => {
    const transforms = getModelTransforms(modelName);
    return normalizeForApi<T>(data, { ...options, customTransforms: { ...transforms, ...options.customTransforms } });
};

/**
 * Batch normalize multiple documents with different models
 */
export const batchNormalizeWithModels = (documents: Array<{ data: any; modelName: string }>, options: ApiNormalizeOptions = {}): any[] => {
    return documents.map(({ data, modelName }) => normalizeWithModelTransforms(data, modelName, options));
};

// ============================================================================
// PERFORMANCE MONITORING SERVICE
// ============================================================================

/**
 * Performance monitoring service for normalization operations
 */
export class PerformanceMonitoringService {
    private static instance: PerformanceMonitoringService;
    private monitoringEnabled = process.env.NODE_ENV !== 'production';
    private reportInterval: NodeJS.Timeout | null = null;

    private constructor() { }

    static getInstance(): PerformanceMonitoringService {
        if (!PerformanceMonitoringService.instance) {
            PerformanceMonitoringService.instance = new PerformanceMonitoringService();
        }
        return PerformanceMonitoringService.instance;
    }

    enable(): void {
        this.monitoringEnabled = true;
        console.log('Normalization performance monitoring enabled');
    }

    disable(): void {
        this.monitoringEnabled = false;
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = null;
        }
        console.log('Normalization performance monitoring disabled');
    }

    startPeriodicReporting(intervalMs: number = 300000): void {
        if (!this.monitoringEnabled) return;
        if (this.reportInterval) clearInterval(this.reportInterval);
        this.reportInterval = setInterval(() => this.logPerformanceReport(), intervalMs);
        console.log(`Started periodic performance reporting every ${intervalMs / 1000} seconds`);
    }

    stopPeriodicReporting(): void {
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = null;
            console.log('Stopped periodic performance reporting');
        }
    }

    getPerformanceReport(): { normalization: any; cache: any; memory: any; recommendations: string[] } {
        const normalizationMetrics = NormalizationPerformanceMonitor.getMetrics();
        const cacheStats = getNormalizationCacheStats();
        const memoryUsage = getMemoryUsage();
        const recommendations: string[] = [];

        if (cacheStats.hitRate < 0.5 && cacheStats.hitCount + cacheStats.missCount > 100) {
            recommendations.push('Low cache hit rate detected. Consider increasing cache size or reviewing caching strategy.');
        }
        if (normalizationMetrics.averageTime > 50) {
            recommendations.push('High average normalization time. Consider enabling caching or optimizing document structure.');
        }
        if (normalizationMetrics.largeArrayOperations > 10) {
            recommendations.push('Frequent large array operations detected. Consider pagination or chunking strategies.');
        }
        if (memoryUsage.warning) {
            recommendations.push('High memory usage detected. Consider processing data in smaller batches.');
        }
        if (memoryUsage.critical) {
            recommendations.push('CRITICAL: Very high memory usage. Immediate action required.');
        }

        return { normalization: normalizationMetrics, cache: cacheStats, memory: { ...memoryUsage, usageMB: (memoryUsage.usage / 1024 / 1024).toFixed(2) }, recommendations };
    }

    logPerformanceReport(): void {
        if (!this.monitoringEnabled) return;
        const report = this.getPerformanceReport();
        console.log('\n=== Normalization Performance Report ===');
        console.log('Normalization Metrics:', report.normalization);
        console.log('Cache Statistics:', report.cache);
        console.log('Memory Usage:', report.memory);
        if (report.recommendations.length > 0) {
            console.log('Recommendations:');
            report.recommendations.forEach((rec, index) => console.log(`  ${index + 1}. ${rec}`));
        }
        console.log('==========================================\n');
    }

    resetMetrics(): void {
        NormalizationPerformanceMonitor.resetMetrics();
        console.log('Performance metrics reset');
    }

    isEnabled(): boolean {
        return this.monitoringEnabled;
    }
}

/**
 * Global performance monitoring instance
 */
export const performanceMonitor = PerformanceMonitoringService.getInstance();

/**
 * Enable performance monitoring in development
 */
export const enablePerformanceMonitoring = () => {
    if (process.env.NODE_ENV !== 'production') {
        performanceMonitor.enable();
        performanceMonitor.startPeriodicReporting();
        console.log('Normalization performance monitoring initialized');
    }
};

/**
 * Express middleware to add performance monitoring endpoints
 */
export const performanceMonitoringMiddleware = (req: any, res: any, next: any) => {
    if (req.path === '/api/v1/performance/normalization') {
        const report = performanceMonitor.getPerformanceReport();
        return res.json({ success: true, data: report, timestamp: new Date().toISOString() });
    }
    if (req.path === '/api/v1/performance/normalization/reset') {
        performanceMonitor.resetMetrics();
        return res.json({ success: true, message: 'Performance metrics reset', timestamp: new Date().toISOString() });
    }
    next();
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get normalization cache statistics
 */
export const getNormalizationCacheStats = () => normalizationCache.getStats();

/**
 * Clear normalization cache
 */
export const clearNormalizationCache = () => normalizationCache.clear();

/**
 * Get current memory usage information
 */
export const getMemoryUsage = () => MemoryMonitor.checkMemoryUsage();
