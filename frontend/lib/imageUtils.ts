/**
 * Image optimization utilities for Next.js Image component
 * Provides blur placeholders and image optimization helpers
 */

/**
 * Generate a simple SVG blur placeholder for images
 * This provides a better loading experience with minimal overhead
 * 
 * @param width - Image width
 * @param height - Image height
 * @param color - Background color (default: #eeeeee)
 * @returns Base64 encoded SVG data URL
 */
export function generateBlurDataURL(
    width: number = 700,
    height: number = 475,
    color: string = '#eeeeee'
): string {
    const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${width}" height="${height}" fill="${color}"/>
        </svg>
    `;

    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate a shimmer effect blur placeholder
 * Creates an animated shimmer effect for loading states
 * 
 * @param width - Image width
 * @param height - Image height
 * @returns Base64 encoded SVG data URL with shimmer animation
 */
export function generateShimmerDataURL(
    width: number = 700,
    height: number = 475
): string {
    const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#f0f0f0;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#e0e0e0;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#f0f0f0;stop-opacity:1" />
                    <animate attributeName="x1" from="-100%" to="100%" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="x2" from="0%" to="200%" dur="2s" repeatCount="indefinite" />
                </linearGradient>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#shimmer)"/>
        </svg>
    `;

    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Get optimized image sizes for responsive images
 * Returns sizes attribute for Next.js Image component
 * 
 * @param type - Image type (gallery, thumbnail, card, banner)
 * @returns Sizes string for responsive images
 */
export function getImageSizes(type: 'gallery' | 'thumbnail' | 'card' | 'banner' | 'avatar'): string {
    switch (type) {
        case 'gallery':
            return '(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw';
        case 'thumbnail':
            return '(max-width: 768px) 33vw, 20vw';
        case 'card':
            return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
        case 'banner':
            return '100vw';
        case 'avatar':
            return '(max-width: 768px) 40px, 48px';
        default:
            return '100vw';
    }
}

/**
 * Preload critical images for better performance
 * Should be used for above-the-fold images
 * 
 * @param src - Image source URL
 * @param type - Image type for sizes
 */
export function preloadImage(src: string, type: 'gallery' | 'thumbnail' | 'card' | 'banner' = 'gallery'): void {
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    link.imageSizes = getImageSizes(type);

    document.head.appendChild(link);
}
