/**
 * Web Vitals monitoring utilities
 * Tracks Core Web Vitals for performance optimization
 * 
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Initial render
 * - TTFB (Time to First Byte): Server response time
 * - INP (Interaction to Next Paint): Responsiveness
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

/**
 * Report Web Vitals to console in development
 * Can be extended to send to analytics service in production
 */
export function reportWebVitals(metric: Metric): void {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vitals] ${metric.name}:`, {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
        });
    }

    // In production, send to analytics service
    // Example: sendToAnalytics(metric);
}

/**
 * Initialize Web Vitals monitoring
 * Call this in the root layout or _app component
 */
export function initWebVitals(): void {
    if (typeof window === 'undefined') return;

    try {
        // Monitor all Core Web Vitals
        // Note: FID has been replaced by INP in web-vitals v3+
        onCLS(reportWebVitals);
        onFCP(reportWebVitals);
        onLCP(reportWebVitals);
        onTTFB(reportWebVitals);
        onINP(reportWebVitals);
    } catch (error) {
        console.error('Error initializing Web Vitals:', error);
    }
}

/**
 * Get performance thresholds for Core Web Vitals
 * Based on Google's recommendations
 */
export const WEB_VITALS_THRESHOLDS = {
    LCP: {
        good: 2500, // 2.5s
        needsImprovement: 4000, // 4s
    },
    // Note: FID has been deprecated in favor of INP
    CLS: {
        good: 0.1,
        needsImprovement: 0.25,
    },
    FCP: {
        good: 1800, // 1.8s
        needsImprovement: 3000, // 3s
    },
    TTFB: {
        good: 800, // 800ms
        needsImprovement: 1800, // 1.8s
    },
    INP: {
        good: 200, // 200ms
        needsImprovement: 500, // 500ms
    },
} as const;

/**
 * Get rating for a metric value
 */
export function getMetricRating(
    metricName: keyof typeof WEB_VITALS_THRESHOLDS,
    value: number
): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = WEB_VITALS_THRESHOLDS[metricName];

    if (value <= thresholds.good) {
        return 'good';
    } else if (value <= thresholds.needsImprovement) {
        return 'needs-improvement';
    } else {
        return 'poor';
    }
}

/**
 * Performance marks for custom measurements
 */
export const PerformanceMarks = {
    TOUR_DATA_FETCH_START: 'tour-data-fetch-start',
    TOUR_DATA_FETCH_END: 'tour-data-fetch-end',
    GALLERY_RENDER_START: 'gallery-render-start',
    GALLERY_RENDER_END: 'gallery-render-end',
    REVIEWS_LOAD_START: 'reviews-load-start',
    REVIEWS_LOAD_END: 'reviews-load-end',
} as const;

/**
 * Mark a performance point
 */
export function markPerformance(name: string): void {
    if (typeof window === 'undefined' || !window.performance) return;

    try {
        window.performance.mark(name);
    } catch (error) {
        console.error('Error marking performance:', error);
    }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(
    name: string,
    startMark: string,
    endMark: string
): number | null {
    if (typeof window === 'undefined' || !window.performance) return null;

    try {
        window.performance.measure(name, startMark, endMark);
        const measure = window.performance.getEntriesByName(name)[0];

        if (process.env.NODE_ENV === 'development') {
            console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
        }

        return measure.duration;
    } catch (error) {
        console.error('Error measuring performance:', error);
        return null;
    }
}
