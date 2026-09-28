/**
 * Media API Client
 * 
 * API client for gallery media management operations.
 * Provides type-safe methods for fetching, uploading, and deleting media.
 * 
 * Requirements: 1.1, 2.1, 5.1
 */

import { api, handleApiError, extractResponseData } from './apiClient';
import type {
    MediaQueryResponse,
    MediaQueryParams,
    UploadResponse,
    UploadMediaParams,
    DeleteMediaParams,
    UpdateMediaParams,
    MediaTab,
    MediaItem,
    MediaType,
    ResourceType,
} from '@/types/gallery';

/**
 * Transform backend media item to frontend MediaItem format
 */
function transformMediaItem(item: any, mediaType: MediaTab): MediaItem {
    // Determine media type
    let type: MediaType = 'image';
    if (mediaType === 'videos') {
        type = 'video';
    } else if (mediaType === 'pdfs') {
        type = 'pdf';
    }

    // Determine resource type
    let resourceType: ResourceType = 'image';
    if (item.resourceType === 'video') {
        resourceType = 'video';
    } else if (item.resourceType === 'raw' || type === 'pdf') {
        resourceType = 'raw';
    }

    return {
        id: item.id,
        publicId: item.publicId || '',
        url: item.url || '',
        secureUrl: item.secureUrl || item.url || '',
        mediaType: type,
        format: item.format || '',
        width: item.width,
        height: item.height,
        bytes: item.bytes || 0,
        createdAt: item.uploadedAt || new Date().toISOString(),
        resourceType,
        thumbnailUrl: item.thumbnailUrl,
        originalFilename: item.originalFilename || item.displayName || item.title || 'Untitled',
        // Editable metadata
        title: item.title || '',
        description: item.description || '',
        tags: item.tags || [],
    };
}

/**
 * Get all media with pagination
 * 
 * Fetches media items filtered by type with cursor-based pagination.
 * 
 * @param params - Query parameters including page cursor and media type
 * @returns Promise with media resources and next cursor
 * @throws ApiError if request fails
 * 
 * Requirements: 1.1, 1.4
 */
export async function getAllMedia(
    params: MediaQueryParams
): Promise<MediaQueryResponse> {
    try {
        const { pageParam, mediaType } = params;

        const response = await api.get('/gallery', {
            params: {
                mediaType,
                page: pageParam,
                limit: 20, // Load 20 items per page for better performance (backend expects 'limit', not 'pageSize')
            },
        });

        // Get the full response data directly - don't use extractResponseData for this endpoint
        // since we need both data (list) and pagination info. This endpoint (getMedia) returns
        // paginated lists under `items`, not `data` — fall back to `data` for resilience only.
        const fullResponse = response.data;
        const rawResources = fullResponse.items ?? fullResponse.data ?? [];
        // Transform each item to match frontend MediaItem interface
        const resources = rawResources.map((item: any) => transformMediaItem(item, mediaType));


        // Extract pagination info from server response
        const pagination = fullResponse.pagination || {};
        const currentPage = pagination.page || pageParam;
        const totalPages = pagination.totalPages || 1;
        const totalItems = pagination.totalItems || 0;
        const hasMore = currentPage < totalPages;


        return {
            success: fullResponse.success !== false,
            data: resources,
            message: fullResponse.message || '',
            pagination: {
                page: currentPage,
                limit: pagination.limit || 20,
                totalItems,
                totalPages,
            },
            totalImages: fullResponse.totalImages || 0,
            totalVideos: fullResponse.totalVideos || 0,
            totalPDFs: fullResponse.totalPDFs || 0,
            // Legacy format support for backward compatibility
            resources,
            nextCursor: hasMore ? (currentPage + 1) : null,
            totalCount: totalItems,
        };
    } catch (error) {
        throw handleApiError(error, 'fetching media');
    }
}

/**
 * Upload media files
 * 
 * Uploads one or more media files to the server, which stores them in R2.
 * Supports images, videos, and PDFs.
 * 
 * @param params - Upload parameters including FormData and user ID
 * @returns Promise with upload response including URLs and resources
 * @throws ApiError if upload fails (e.g., 410 for missing API key)
 * 
 * Requirements: 2.1, 9.1, 9.2, 9.3
 */
export async function uploadMedia(
    params: UploadMediaParams
): Promise<UploadResponse> {
    try {
        const { formData } = params;
        // Note: userId is no longer used - server gets it from httpOnly cookie

        const response = await api.post('/gallery', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        // Get the full response first, then extract data appropriately
        const fullResponse = response.data; // This is the full server response
        const data = extractResponseData<any>(response); // This extracts the nested data

        // Debug: Log both structures
        console.log('📤 Upload - Full response:', fullResponse);
        console.log('📤 Upload - Extracted data:', data);

        // Handle the actual server response structure
        // Server returns: { success: true, message: "...", data: { gallery: { images: [...], videos: [...], PDF: [...] } } }
        // extractResponseData returns just the gallery object from response.data.data
        let resources: any[] = [];
        let urls: string[] = [];

        // The extracted data IS the gallery object, but it might be nested
        if (data && data.gallery && (data.gallery.images || data.gallery.videos || data.gallery.PDF)) {
            // Handle nested gallery structure: data = { gallery: { images: [...], videos: [...], PDF: [...] } }
            const gallery = data.gallery;
            const allItems = [
                ...(gallery.images || []),
                ...(gallery.videos || []),
                ...(gallery.PDF || [])
            ];

            resources = allItems;
            urls = allItems.map((item: any) => item.url || item.secure_url).filter(Boolean);
            console.log('📤 Upload - Found items in nested gallery:', allItems.length);
        } else if (data && (data.images || data.videos || data.PDF)) {
            // Handle direct gallery structure: data = { images: [...], videos: [...], PDF: [...] }
            const allItems = [
                ...(data.images || []),
                ...(data.videos || []),
                ...(data.PDF || [])
            ];

            resources = allItems;
            urls = allItems.map((item: any) => item.url || item.secure_url).filter(Boolean);
            console.log('📤 Upload - Found items in direct gallery arrays:', allItems.length);
        } else {
            // Fallback for other response structures
            resources = data.resources ?? data.data ?? [];
            urls = data.urls || data.secureUrls || [];

            // If we have resources but no URLs, extract URLs from resources
            if (urls.length === 0 && resources.length > 0) {
                urls = resources.map((r: any) => r.secureUrl || r.url).filter(Boolean);
            }
            console.log('📤 Upload - Using fallback structure:', resources.length);
        }

        console.log('📤 Upload - Final result:', {
            urls: urls.length,
            resources: resources.length,
            success: fullResponse.success
        });

        return {
            success: fullResponse.success !== false,
            urls: urls,
            resources: resources,
            message: fullResponse.message,
        };
    } catch (error: any) {
        // Handle specific error cases with detailed messages
        const statusCode = error.statusCode || error.response?.status;
        const errorMessage = error.message || error.response?.data?.message;

        // File size errors (413 Payload Too Large)
        if (statusCode === 413 || errorMessage?.toLowerCase().includes('file size') || errorMessage?.toLowerCase().includes('too large')) {
            throw new Error(
                'One or more files exceed the maximum size limit of 10MB. Please reduce file sizes and try again.'
            );
        }

        // File type errors (415 Unsupported Media Type)
        if (statusCode === 415 || errorMessage?.toLowerCase().includes('file type') || errorMessage?.toLowerCase().includes('unsupported')) {
            throw new Error(
                'One or more files have an unsupported file type. Only images (JPG, PNG, GIF, WebP), videos (MP4, MOV, WebM), and PDFs are allowed.'
            );
        }

        // Network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || errorMessage?.toLowerCase().includes('network')) {
            throw new Error(
                'Network error occurred during upload. Please check your internet connection and try again.'
            );
        }

        // Timeout errors
        if (error.code === 'ETIMEDOUT' || errorMessage?.toLowerCase().includes('timeout')) {
            throw new Error(
                'Upload timed out. This may be due to slow connection or large file sizes. Please try again.'
            );
        }

        // Authentication errors
        if (statusCode === 401) {
            throw new Error(
                'Authentication required. Please log in again to upload media.'
            );
        }

        // Permission errors
        if (statusCode === 403) {
            throw new Error(
                'You do not have permission to upload media. Please contact your administrator.'
            );
        }

        // Server errors (500+)
        if (statusCode >= 500) {
            throw new Error(
                'Server error occurred during upload. Please try again later or contact support if the issue persists.'
            );
        }

        // Generic error with custom message if available
        throw new Error(
            errorMessage || 'Failed to upload media. Please try again.'
        );
    }
}

/**
 * Delete media files
 * 
 * Deletes one or more media items from R2 storage.
 * Supports both single and bulk deletion.
 * 
 * @param params - Delete parameters including user ID, media IDs, and media type
 * @returns Promise that resolves when deletion is complete
 * @throws ApiError if deletion fails (e.g., 401 for unauthorized, 404 for not found)
 * 
 * Requirements: 5.1, 9.1, 9.3, 9.5
 */
export async function deleteMedia(
    params: DeleteMediaParams
): Promise<void> {
    try {
        const { mediaIds, mediaType } = params;
        // Note: userId is no longer used - server gets it from httpOnly cookie

        // Ensure mediaIds is always an array
        const ids = Array.isArray(mediaIds) ? mediaIds : [mediaIds];

        // Convert frontend mediaType to backend format
        let backendMediaType = mediaType;
        if (mediaType === 'pdfs') {
            backendMediaType = 'PDF';
        }

        await api.delete('/gallery', {
            data: {
                imageIds: ids,
                mediaType: backendMediaType
            },
        });

        // No return value needed for successful deletion
    } catch (error: any) {
        // Handle specific error cases with detailed messages
        const statusCode = error.statusCode || error.response?.status;
        const errorMessage = error.message || error.response?.data?.message;

        // Authentication errors (401 Unauthorized)
        if (statusCode === 401) {
            throw new Error(
                'Authentication required. Your session may have expired. Please log in again to delete media.'
            );
        }

        // Not found errors (404 Not Found)
        if (statusCode === 404) {
            throw new Error(
                'Media not found. The item may have already been deleted or does not exist.'
            );
        }

        // Permission errors (403 Forbidden)
        if (statusCode === 403) {
            throw new Error(
                'You do not have permission to delete this media. Please contact your administrator.'
            );
        }

        // Network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || errorMessage?.toLowerCase().includes('network')) {
            throw new Error(
                'Network error occurred during deletion. Please check your internet connection and try again.'
            );
        }

        // Timeout errors
        if (error.code === 'ETIMEDOUT' || errorMessage?.toLowerCase().includes('timeout')) {
            throw new Error(
                'Deletion request timed out. Please try again.'
            );
        }

        // Server errors (500+)
        if (statusCode >= 500) {
            throw new Error(
                'Server error occurred during deletion. Please try again later or contact support if the issue persists.'
            );
        }

        // Generic error with custom message if available
        throw new Error(
            errorMessage || 'Failed to delete media. Please try again.'
        );
    }
}

/**
 * Helper function to extract the object key/filename from a media URL
 *
 * @param url - Media URL
 * @returns Identifier extracted from the URL
 */
export function extractPublicId(url: string): string | undefined {
    const parts = url.split('/');
    const fileName = parts.pop();
    const publicId = fileName?.split('.')[0];
    return publicId;
}

/**
 * Helper function to generate a thumbnail URL.
 *
 * R2 has no on-the-fly image transformation, so this returns the original URL.
 *
 * @param url - Original media URL
 * @param width - Desired thumbnail width (default: 300px)
 * @returns Transformed URL with thumbnail parameters, or the original URL as-is
 */
export function getThumbnailUrl(url: string, _width: number = 300): string {
    return url;
}

/**
 * Helper function to validate file before upload
 * 
 * Validates file type and size against accepted criteria.
 * 
 * @param file - File to validate
 * @param acceptedTypes - Map of accepted MIME types
 * @param maxSize - Maximum file size in bytes
 * @returns Validation result with error message if invalid
 * 
 * Requirements: 2.3
 */
export function validateFile(
    file: File,
    acceptedTypes: Record<string, string[]>,
    maxSize: number
): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `File "${file.name}" exceeds maximum size of ${maxSizeMB}MB`,
        };
    }

    // Check file type against MIME type patterns (keys) and extensions (values)
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Check if file matches any accepted MIME type pattern or extension
    const isAccepted = Object.entries(acceptedTypes).some(([mimePattern, extensions]) => {
        // Check MIME type pattern (e.g., "image/*" matches "image/jpeg")
        if (mimePattern.endsWith('/*')) {
            const category = mimePattern.split('/')[0];
            if (fileType.startsWith(category + '/')) {
                return true;
            }
        } else if (fileType === mimePattern) {
            return true;
        }

        // Also check file extension as fallback
        return extensions.some(ext => fileName.endsWith(ext.toLowerCase()));
    });

    if (!isAccepted) {
        return {
            valid: false,
            error: `File type "${fileType}" is not accepted for "${file.name}"`,
        };
    }

    return { valid: true };
}

/**
 * Helper function to validate multiple files
 * 
 * @param files - Array of files to validate
 * @param acceptedTypes - Map of accepted MIME types
 * @param maxSize - Maximum file size in bytes
 * @param maxFiles - Maximum number of files allowed
 * @returns Validation result with valid files and errors
 * 
 * Requirements: 2.3
 */
export function validateFiles(
    files: File[],
    acceptedTypes: Record<string, string[]>,
    maxSize: number,
    maxFiles: number
): { validFiles: File[]; errors: string[] } {
    const errors: string[] = [];
    const validFiles: File[] = [];

    // Check file count
    if (files.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed. ${files.length} files selected.`);
        return { validFiles: [], errors };
    }

    // Validate each file
    files.forEach(file => {
        const result = validateFile(file, acceptedTypes, maxSize);
        if (result.valid) {
            validFiles.push(file);
        } else if (result.error) {
            errors.push(result.error);
        }
    });

    return { validFiles, errors };
}

/**
 * Update media metadata
 * 
 * Updates title, description, and tags for a media item.
 * 
 * @param params - Update parameters including user ID, image ID, and metadata
 * @returns Promise that resolves when update is complete
 * @throws ApiError if update fails
 * 
 * Requirements: Metadata editing
 */
export async function updateMedia(
    params: UpdateMediaParams
): Promise<void> {
    try {
        const { imageId, mediaType, title, description, tags } = params;
        // Note: userId is no longer used - server gets it from httpOnly cookie

        // Convert mediaType to backend format
        let backendMediaType = mediaType;
        if (mediaType === 'images') backendMediaType = 'image';
        else if (mediaType === 'videos') backendMediaType = 'video';
        else if (mediaType === 'PDF' || mediaType === 'pdfs') backendMediaType = 'raw';

        // Send as JSON since uploadNone expects form fields, not files
        const body: any = {};
        if (title !== undefined) body.title = title;
        if (description !== undefined) body.description = description;
        if (tags !== undefined) body.tags = tags; // Send as array, not JSON string

        await api.patch(`/gallery/${imageId}`, body, {
            params: { mediaType: backendMediaType },
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // No return value needed for successful update
    } catch (error: any) {
        // Handle specific error cases with detailed messages
        const statusCode = error.statusCode || error.response?.status;
        const errorMessage = error.message || error.response?.data?.message;

        // Authentication errors (401 Unauthorized)
        if (statusCode === 401) {
            throw new Error(
                'Authentication required. Your session may have expired. Please log in again.'
            );
        }

        // Not found errors (404 Not Found)
        if (statusCode === 404) {
            throw new Error(
                'Media not found. The item may have been deleted.'
            );
        }

        // Permission errors (403 Forbidden)
        if (statusCode === 403) {
            throw new Error(
                'You do not have permission to update this media.'
            );
        }

        // Network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || errorMessage?.toLowerCase().includes('network')) {
            throw new Error(
                'Network error occurred during update. Please check your internet connection and try again.'
            );
        }

        // Server errors (500+)
        if (statusCode >= 500) {
            throw new Error(
                'Server error occurred during update. Please try again later.'
            );
        }

        // Generic error with custom message if available
        throw new Error(
            errorMessage || 'Failed to update media. Please try again.'
        );
    }
}
