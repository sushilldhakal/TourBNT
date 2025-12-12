/**
 * Image Optimization Utilities
 * 
 * Provides functions for optimizing images using Cloudinary transformations.
 * Generates thumbnail URLs with appropriate sizing and quality settings.
 * 
 * Requirements: 10.2
 */

/**
 * Cloudinary transformation options
 */
export interface CloudinaryTransformOptions {
    /**
     * Width in pixels
     */
    width?: number;

    /**
     * Height in pixels
     */
    height?: number;

    /**
     * Crop mode
     * - fill: Resize and crop to exact dimensions
     * - fit: Resize to fit within dimensions
     * - scale: Resize to exact dimensions (may distort)
     * - crop: Crop to exact dimensions
     */
    crop?: 'fill' | 'fit' | 'scale' | 'crop';

    /**
     * Quality (1-100)
     */
    quality?: number;

    /**
     * Format (auto, jpg, png, webp, etc.)
     */
    format?: string;

    /**
     * Fetch format (auto for automatic format selection)
     */
    fetchFormat?: 'auto';
}

/**
 * Get thumbnail URL with Cloudinary transformations
 * 
 * Transforms a Cloudinary URL to use optimized thumbnails for grid view.
 * Applies width, height, crop mode, and quality settings.
 * 
 * @param url - Original Cloudinary URL
 * @param width - Thumbnail width in pixels (default: 300)
 * @param height - Thumbnail height in pixels (default: 300)
 * @param options - Additional transformation options
 * @returns Optimized thumbnail URL
 * 
 * @example
 * ```ts
 * const thumbnail = getThumbnailUrl(
 *   'https://res.cloudinary.com/demo/image/upload/sample.jpg',
 *   300,
 *   300
 * );
 * // Returns: https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,q_auto,f_auto/sample.jpg
 * ```
 */
export function getThumbnailUrl(
    url: string,
    width: number = 300,
    height: number = 300,
    options: CloudinaryTransformOptions = {}
): string {
    // Return original URL if not a Cloudinary URL
    if (!url || !url.includes('cloudinary.com')) {
        return url;
    }

    // Default options
    const {
        crop = 'fill',
        quality = 'auto',
        format = 'auto',
    } = options;

    // Build transformation string
    const transformations: string[] = [];

    // Add dimensions
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);

    // Add crop mode
    transformations.push(`c_${crop}`);

    // Add quality (auto for automatic optimization)
    transformations.push(`q_${quality}`);

    // Add format (auto for automatic format selection - WebP when supported)
    transformations.push(`f_${format}`);

    const transformString = transformations.join(',');

    // Insert transformations into URL
    // Replace /upload/ with /upload/{transformations}/
    return url.replace('/upload/', `/upload/${transformString}/`);
}

/**
 * Get full-size optimized URL
 * 
 * Applies quality optimization without resizing.
 * Used for detail panel and full-size previews.
 * 
 * @param url - Original Cloudinary URL
 * @param quality - Quality setting (default: 'auto')
 * @returns Optimized full-size URL
 * 
 * @example
 * ```ts
 * const fullSize = getFullSizeUrl(
 *   'https://res.cloudinary.com/demo/image/upload/sample.jpg'
 * );
 * // Returns: https://res.cloudinary.com/demo/image/upload/q_auto,f_auto/sample.jpg
 * ```
 */
export function getFullSizeUrl(
    url: string,
    quality: string | number = 'auto'
): string {
    // Return original URL if not a Cloudinary URL
    if (!url || !url.includes('cloudinary.com')) {
        return url;
    }

    // Build transformation string with quality and format only
    const transformString = `q_${quality},f_auto`;

    // Insert transformations into URL
    return url.replace('/upload/', `/upload/${transformString}/`);
}

/**
 * Get responsive image URLs for different screen sizes
 * 
 * Generates a set of URLs with different sizes for responsive images.
 * Used with Next.js Image component's srcSet.
 * 
 * @param url - Original Cloudinary URL
 * @param sizes - Array of widths to generate
 * @returns Object mapping sizes to URLs
 * 
 * @example
 * ```ts
 * const srcSet = getResponsiveUrls(
 *   'https://res.cloudinary.com/demo/image/upload/sample.jpg',
 *   [300, 600, 900]
 * );
 * // Returns: {
 * //   300: 'https://res.cloudinary.com/.../w_300.../sample.jpg',
 * //   600: 'https://res.cloudinary.com/.../w_600.../sample.jpg',
 * //   900: 'https://res.cloudinary.com/.../w_900.../sample.jpg'
 * // }
 * ```
 */
export function getResponsiveUrls(
    url: string,
    sizes: number[] = [300, 600, 900, 1200]
): Record<number, string> {
    const urls: Record<number, string> = {};

    sizes.forEach((size) => {
        urls[size] = getThumbnailUrl(url, size, size);
    });

    return urls;
}

/**
 * Check if URL is a Cloudinary URL
 * 
 * @param url - URL to check
 * @returns True if URL is from Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
    return Boolean(url && url.includes('cloudinary.com'));
}

/**
 * Extract public ID from Cloudinary URL
 * 
 * @param url - Cloudinary URL
 * @returns Public ID or null if not a Cloudinary URL
 * 
 * @example
 * ```ts
 * const publicId = extractPublicId(
 *   'https://res.cloudinary.com/demo/image/upload/v1234/folder/sample.jpg'
 * );
 * // Returns: 'folder/sample'
 * ```
 */
export function extractPublicId(url: string): string | null {
    if (!isCloudinaryUrl(url)) {
        return null;
    }

    try {
        // Match pattern: /upload/[version]/[public_id].[extension]
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * Preset thumbnail sizes for common use cases
 */
export const THUMBNAIL_PRESETS = {
    /**
     * Small thumbnail for grid view on mobile (150x150)
     */
    SMALL: { width: 150, height: 150 },

    /**
     * Medium thumbnail for grid view on tablet/desktop (300x300)
     */
    MEDIUM: { width: 300, height: 300 },

    /**
     * Large thumbnail for detail preview (600x600)
     */
    LARGE: { width: 600, height: 600 },

    /**
     * Extra large for full-screen preview (1200x1200)
     */
    XLARGE: { width: 1200, height: 1200 },
} as const;

/**
 * Get thumbnail URL using preset size
 * 
 * @param url - Original Cloudinary URL
 * @param preset - Preset size name
 * @returns Optimized thumbnail URL
 * 
 * @example
 * ```ts
 * const thumbnail = getThumbnailUrlPreset(url, 'MEDIUM');
 * ```
 */
export function getThumbnailUrlPreset(
    url: string,
    preset: keyof typeof THUMBNAIL_PRESETS
): string {
    const { width, height } = THUMBNAIL_PRESETS[preset];
    return getThumbnailUrl(url, width, height);
}
