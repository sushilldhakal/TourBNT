/**
 * Performance optimization configuration
 * Centralized configuration for all performance-related settings
 */

/**
 * React Query cache configuration
 * Optimized for tour detail pages with frequent data access
 */
export const QUERY_CACHE_CONFIG = {
    // Tour data caching
    tour: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    },
    // Reviews caching (more dynamic, shorter cache)
    reviews: {
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
    },
    // Related tours caching
    relatedTours: {
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
    },
    // Tour list caching
    tourList: {
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    },
} as const;

/**
 * Image optimization configuration
 */
export const IMAGE_CONFIG = {
    // Image quality settings
    quality: {
        high: 90, // For hero images, gallery main images
        medium: 80, // For thumbnails, cards
        low: 70, // For background images
    },
    // Lazy loading thresholds
    lazyLoadThreshold: '200px', // Start loading when 200px from viewport
    // Blur placeholder dimensions
    blurPlaceholder: {
        width: 700,
        height: 475,
    },
} as const;

/**
 * Video optimization configuration
 */
export const VIDEO_CONFIG = {
    // Preload strategy
    preload: 'none' as const, // Don't preload video data
    // Lazy loading
    loading: 'lazy' as const,
    // Poster image quality
    posterQuality: 70,
} as const;

/**
 * Bundle optimization configuration
 */
export const BUNDLE_CONFIG = {
    // Components to dynamically import
    dynamicComponents: [
        'TourGallery',
        'TourTabs',
        'ReviewSystem',
        'BookingWidget',
        'DepartureManager',
        'ItineraryAccordion',
    ],
    // Chunk size thresholds (in KB)
    chunkSizeWarning: 244, // Warn if chunk exceeds 244KB
    chunkSizeLimit: 488, // Error if chunk exceeds 488KB
} as const;

/**
 * API request optimization
 */
export const API_CONFIG = {
    // Request timeouts
    timeout: {
        default: 15000, // 15 seconds
        critical: 10000, // 10 seconds for critical requests
        background: 30000, // 30 seconds for background requests
    },
    // Retry configuration
    retry: {
        count: 1,
        delay: 1000,
    },
    // Parallel request limits
    maxParallelRequests: 6,
} as const;

/**
 * Prefetch configuration
 */
export const PREFETCH_CONFIG = {
    // Enable prefetching
    enabled: true,
    // Prefetch on hover delay (ms)
    hoverDelay: 100,
    // Prefetch on viewport intersection
    intersectionThreshold: 0.5,
    // Resources to prefetch
    resources: {
        relatedTours: true,
        tourImages: false, // Don't prefetch images (too heavy)
        reviews: false, // Don't prefetch reviews (loaded on demand)
    },
} as const;

/**
 * Performance monitoring configuration
 */
export const MONITORING_CONFIG = {
    // Enable Web Vitals monitoring
    enabled: true,
    // Sample rate (0-1, 1 = 100%)
    sampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,
    // Report to console in development
    consoleLogging: process.env.NODE_ENV === 'development',
    // Custom performance marks
    customMarks: {
        tourDataFetch: true,
        galleryRender: true,
        reviewsLoad: true,
    },
} as const;

/**
 * Get cache time for a specific query type
 */
export function getCacheTime(type: keyof typeof QUERY_CACHE_CONFIG): {
    staleTime: number;
    gcTime: number;
} {
    return QUERY_CACHE_CONFIG[type];
}

/**
 * Get image quality based on image type
 */
export function getImageQuality(type: 'high' | 'medium' | 'low'): number {
    return IMAGE_CONFIG.quality[type];
}

/**
 * Check if component should be dynamically imported
 */
export function shouldDynamicImport(componentName: string): boolean {
    return (BUNDLE_CONFIG.dynamicComponents as readonly string[]).includes(componentName);
}

/**
 * Get API timeout for request type
 */
export function getApiTimeout(type: 'default' | 'critical' | 'background'): number {
    return API_CONFIG.timeout[type];
}
