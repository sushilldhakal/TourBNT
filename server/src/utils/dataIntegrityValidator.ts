import { Types } from 'mongoose';

/**
 * Data integrity validation utilities for normalization
 */

/**
 * Validate that no business data is lost during normalization
 * @param original - Original document before normalization
 * @param normalized - Normalized document after processing
 * @returns Validation result with any issues found
 */
export const validateDataIntegrity = (original: any, normalized: any): {
    isValid: boolean;
    issues: string[];
    businessFieldsPreserved: boolean;
    mongooseFieldsRemoved: boolean;
    idTransformed: boolean;
} => {
    const issues: string[] = [];
    let businessFieldsPreserved = true;
    let mongooseFieldsRemoved = true;
    let idTransformed = true;

    if (!original || !normalized) {
        issues.push('Original or normalized data is null/undefined');
        return {
            isValid: false,
            issues,
            businessFieldsPreserved: false,
            mongooseFieldsRemoved: false,
            idTransformed: false
        };
    }

    // Check if business fields are preserved
    const businessFields = getBusinessFields(original);
    for (const field of businessFields) {
        if (!(field in normalized)) {
            issues.push(`Business field '${field}' was lost during normalization`);
            businessFieldsPreserved = false;
        }
    }

    // Check if Mongoose-specific fields are removed
    const mongooseFields = ['__v', '_id'];
    for (const field of mongooseFields) {
        if (field === '_id') {
            // _id should be removed only if addId option is true (default)
            if (field in normalized && 'id' in normalized) {
                issues.push(`Mongoose field '${field}' was not removed despite 'id' field being present`);
                mongooseFieldsRemoved = false;
            }
        } else if (field in normalized) {
            issues.push(`Mongoose field '${field}' was not removed during normalization`);
            mongooseFieldsRemoved = false;
        }
    }

    // Check if _id was properly transformed to id
    if (original._id) {
        if (!normalized.id) {
            issues.push('_id field was not transformed to id field');
            idTransformed = false;
        } else {
            const expectedId = original._id instanceof Types.ObjectId
                ? original._id.toString()
                : String(original._id);
            if (normalized.id !== expectedId) {
                issues.push(`ID transformation incorrect: expected '${expectedId}', got '${normalized.id}'`);
                idTransformed = false;
            }
        }
    }

    return {
        isValid: issues.length === 0,
        issues,
        businessFieldsPreserved,
        mongooseFieldsRemoved,
        idTransformed
    };
};

/**
 * Get business fields from a document (excluding Mongoose internal fields)
 * @param doc - Document to analyze
 * @returns Array of business field names
 */
const getBusinessFields = (doc: any): string[] => {
    if (!doc || typeof doc !== 'object') {
        return [];
    }

    const mongooseInternalFields = ['_id', '__v', '$__', '$isNew', 'isModified', 'isNew'];
    const businessFields: string[] = [];

    for (const key in doc) {
        if (doc.hasOwnProperty(key) && !mongooseInternalFields.includes(key)) {
            // Skip functions and Mongoose methods
            if (typeof doc[key] !== 'function') {
                businessFields.push(key);
            }
        }
    }

    return businessFields;
};

/**
 * Validate that Mongoose-specific properties are completely removed
 * @param data - Data to validate
 * @returns Validation result
 */
export const validateMongooseFieldsRemoved = (data: any): {
    isValid: boolean;
    foundFields: string[];
} => {
    const mongooseFields = ['__v', '$__', '$isNew'];
    const foundFields: string[] = [];

    const checkObject = (obj: any, path = '') => {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                checkObject(item, `${path}[${index}]`);
            });
            return;
        }

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const fullPath = path ? `${path}.${key}` : key;

                if (mongooseFields.includes(key)) {
                    foundFields.push(fullPath);
                }

                if (typeof obj[key] === 'object') {
                    checkObject(obj[key], fullPath);
                }
            }
        }
    };

    checkObject(data);

    return {
        isValid: foundFields.length === 0,
        foundFields
    };
};

/**
 * Validate consistent ID field transformation across arrays
 * @param data - Array or single document to validate
 * @returns Validation result
 */
export const validateIdConsistency = (data: any): {
    isValid: boolean;
    issues: string[];
} => {
    const issues: string[] = [];

    const checkIdConsistency = (item: any, index?: number) => {
        const prefix = index !== undefined ? `Item ${index}:` : '';

        if (!item || typeof item !== 'object') return;

        // Check if both _id and id exist (should not happen)
        if (item._id && item.id) {
            issues.push(`${prefix} Both '_id' and 'id' fields present`);
        }

        // Check if id is a string when present
        if (item.id && typeof item.id !== 'string') {
            issues.push(`${prefix} 'id' field is not a string: ${typeof item.id}`);
        }

        // Check nested objects and arrays
        for (const key in item) {
            if (item.hasOwnProperty(key) && typeof item[key] === 'object') {
                if (Array.isArray(item[key])) {
                    item[key].forEach((nestedItem: any, nestedIndex: number) => {
                        checkIdConsistency(nestedItem, nestedIndex);
                    });
                } else {
                    checkIdConsistency(item[key]);
                }
            }
        }
    };

    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            checkIdConsistency(item, index);
        });
    } else {
        checkIdConsistency(data);
    }

    return {
        isValid: issues.length === 0,
        issues
    };
};

/**
 * Performance monitoring for normalization operations
 */
export class NormalizationPerformanceMonitor {
    private static metrics: {
        totalOperations: number;
        totalTime: number;
        averageTime: number;
        maxTime: number;
        minTime: number;
        largeArrayOperations: number;
        cacheHits: number;
        cacheMisses: number;
        memoryWarnings: number;
    } = {
            totalOperations: 0,
            totalTime: 0,
            averageTime: 0,
            maxTime: 0,
            minTime: Infinity,
            largeArrayOperations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            memoryWarnings: 0
        };

    /**
     * Start timing a normalization operation
     */
    static startTiming(): () => void {
        const startTime = process.hrtime.bigint();

        return () => {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

            this.recordTiming(duration);
        };
    }

    /**
     * Record timing for a normalization operation
     */
    private static recordTiming(duration: number): void {
        this.metrics.totalOperations++;
        this.metrics.totalTime += duration;
        this.metrics.averageTime = this.metrics.totalTime / this.metrics.totalOperations;
        this.metrics.maxTime = Math.max(this.metrics.maxTime, duration);
        this.metrics.minTime = Math.min(this.metrics.minTime, duration);

        // Log warning if operation is slow
        if (duration > 100) { // More than 100ms
            console.warn(`Slow normalization operation detected: ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * Record large array operation
     */
    static recordLargeArrayOperation(): void {
        this.metrics.largeArrayOperations++;
    }

    /**
     * Record cache hit
     */
    static recordCacheHit(): void {
        this.metrics.cacheHits++;
    }

    /**
     * Record cache miss
     */
    static recordCacheMiss(): void {
        this.metrics.cacheMisses++;
    }

    /**
     * Record memory warning
     */
    static recordMemoryWarning(): void {
        this.metrics.memoryWarnings++;
    }

    /**
     * Get current performance metrics
     */
    static getMetrics() {
        return {
            ...this.metrics,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
        };
    }

    /**
     * Get performance summary report
     */
    static getPerformanceReport(): string {
        const metrics = this.getMetrics();
        return `
Normalization Performance Report:
- Total Operations: ${metrics.totalOperations}
- Average Time: ${metrics.averageTime.toFixed(2)}ms
- Max Time: ${metrics.maxTime.toFixed(2)}ms
- Min Time: ${metrics.minTime === Infinity ? 'N/A' : metrics.minTime.toFixed(2)}ms
- Large Array Operations: ${metrics.largeArrayOperations}
- Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%
- Memory Warnings: ${metrics.memoryWarnings}
        `.trim();
    }

    /**
     * Reset performance metrics
     */
    static resetMetrics(): void {
        this.metrics = {
            totalOperations: 0,
            totalTime: 0,
            averageTime: 0,
            maxTime: 0,
            minTime: Infinity,
            largeArrayOperations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            memoryWarnings: 0
        };
    }

    /**
     * Log performance report to console
     */
    static logPerformanceReport(): void {
        console.log(this.getPerformanceReport());
    }
}