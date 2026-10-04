/**
 * Debounce Utility
 * 
 * Provides debouncing functionality to limit the rate at which a function is called.
 * Useful for optimizing performance of frequently called functions like scroll handlers.
 * 
 * Requirements: 10.5
 */

/**
 * Debounce function
 * 
 * Creates a debounced version of a function that delays invoking until after
 * a specified wait time has elapsed since the last time it was invoked.
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @param immediate - If true, trigger function on leading edge instead of trailing
 * @returns Debounced function
 * 
 * @example
 * ```ts
 * const handleScroll = debounce(() => {
 *   console.log('Scrolled!');
 * }, 200);
 * 
 * window.addEventListener('scroll', handleScroll);
 * ```
 */
export function debounce<A extends unknown[]>(
    func: (...args: A) => unknown,
    wait: number,
    immediate: boolean = false
): (...args: A) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: A) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };

        const callNow = immediate && !timeout;

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(later, wait);

        if (callNow) func(...args);
    };
}

/**
 * Throttle function
 * 
 * Creates a throttled version of a function that only invokes at most once
 * per specified time period.
 * 
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 * 
 * @example
 * ```ts
 * const handleResize = throttle(() => {
 *   console.log('Resized!');
 * }, 200);
 * 
 * window.addEventListener('resize', handleResize);
 * ```
 */
export function throttle<A extends unknown[]>(
    func: (...args: A) => unknown,
    limit: number
): (...args: A) => void {
    let inThrottle: boolean = false;

    return function executedFunction(...args: A) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Request Animation Frame debounce
 * 
 * Debounces a function using requestAnimationFrame for smooth animations.
 * Useful for scroll handlers that update UI.
 * 
 * @param func - Function to debounce
 * @returns Debounced function
 * 
 * @example
 * ```ts
 * const handleScroll = rafDebounce(() => {
 *   updateScrollPosition();
 * });
 * 
 * window.addEventListener('scroll', handleScroll);
 * ```
 */
export function rafDebounce<A extends unknown[]>(
    func: (...args: A) => unknown
): (...args: A) => void {
    let rafId: number | null = null;

    return function executedFunction(...args: A) {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
            func(...args);
            rafId = null;
        });
    };
}
