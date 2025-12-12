'use client';

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/webVitals';

/**
 * Web Vitals Reporter Component
 * Initializes Web Vitals monitoring on the client side
 * 
 * This component should be included in the root layout
 * to track Core Web Vitals across the entire application
 */
export function WebVitalsReporter() {
    useEffect(() => {
        // Initialize Web Vitals monitoring
        initWebVitals();
    }, []);

    // This component doesn't render anything
    return null;
}
