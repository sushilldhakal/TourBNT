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
} from '@/components/dashboard/gallery/types';

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
    if (item.resource_type === 'video') {
        resourceType = 'video';
    } else if (item.resource_type === 'raw' || type === 'pdf') {
        resourceType = 'raw';
    }

    return {
        id: item._id || item.asset_id || item.public_id,
        publicId: item.public_id || '',
        url: item.url || '',
        secureUrl: item.secure_url || item.url || '',
        mediaType: type,
        format: item.format || '',
        width: item.width,
        height: item.height,
        bytes: item.bytes || 0,
        createdAt: item.created_at || item.uploadedAt || new Date().toISOString(),
        resourceType,
        thumbnailUrl: item.thumbnailUrl,
        originalFilename: item.original_filename || item.display_name || item.title || 'Untitled',
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

        const response = await api.get('/api/gallery/media', {
            params: {
                mediaType,
                page: pageParam,
                pageSize: 20, // Load 20 items per page for better performance
            },
        });

        // Extract data from response
        const data = extractResponseData<any>(response);

        console.log('📦 API Response:', { mediaType, data });

        // Transform response to match MediaQueryResponse interface
        // Backend returns data with key matching mediaType (images, pdfs, videos)
        const rawResources = data[mediaType] || [];

        // Transform each item to match frontend MediaItem interface
        const resources = rawResources.map((item: any) => transformMediaItem(item, mediaType));

        // Calculate total count based on mediaType
        let totalCount = 0;
        if (mediaType === 'images') {
            totalCount = data.totalImages || 0;
        } else if (mediaType === 'pdfs') {
            totalCount = data.totalPDFs || 0;
        } else if (mediaType === 'videos') {
            totalCount = data.totalVideos || 0;
        }

        console.log('✅ Transformed resources:', resources.length, 'items');

        return {
            resources,
            nextCursor: data.nextCursor || null,
            totalCount,
        };
    } catch (error) {
        throw handleApiError(error, 'fetching media');
    }
}

/**
 * Upload media files
 * 
 * Uploads one or more media files to Cloudinary storage.
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
        const { formData, userId } = params;

        const response = await api.post(`/api/gallery/${userId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        const data = extractResponseData<any>(response);

        // Transform response to match UploadResponse interface
        return {
            success: data.success !== false,
            urls: data.urls || [],
            resources: data.resources || [],
            message: data.message,
        };
    } catch (error: any) {
        // Handle specific error cases with detailed messages
        const statusCode = error.statusCode || error.response?.status;
        const errorMessage = error.message || error.response?.data?.message;

        // Cloudinary API key not configured (410 Gone)
        if (statusCode === 410) {
            throw new Error(
                'Cloudinary API key not configured. Please configure your API keys in settings to enable media uploads.'
            );
        }

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
 * Deletes one or more media items from Cloudinary storage.
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
        const { userId, mediaIds, mediaType } = params;

        // Ensure mediaIds is always an array
        const ids = Array.isArray(mediaIds) ? mediaIds : [mediaIds];

        // Convert frontend mediaType to backend format
        let backendMediaType = mediaType;
        if (mediaType === 'pdfs') {
            backendMediaType = 'PDF';
        }

        await api.delete(`/api/gallery/${userId}`, {
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

        // Cloudinary-specific errors
        if (errorMessage?.toLowerCase().includes('cloudinary')) {
            throw new Error(
                'Failed to delete media from cloud storage. Please try again or contact support.'
            );
        }

        // Generic error with custom message if available
        throw new Error(
            errorMessage || 'Failed to delete media. Please try again.'
        );
    }
}

/**
 * Helper function to extract public ID from Cloudinary URL
 * 
 * @param url - Cloudinary URL
 * @returns Public ID extracted from URL
 */
export function extractPublicId(url: string): string | undefined {
    const parts = url.split('/');
    const fileName = parts.pop();
    const publicId = fileName?.split('.')[0];
    return publicId;
}

/**
 * Helper function to generate thumbnail URL from Cloudinary URL
 * 
 * Applies Cloudinary transformations to create optimized thumbnails.
 * 
 * @param url - Original Cloudinary URL
 * @param width - Desired thumbnail width (default: 300px)
 * @returns Transformed URL with thumbnail parameters
 * 
 * Requirements: 10.2
 */
export function getThumbnailUrl(url: string, width: number = 300): string {
    if (!url || !url.includes('cloudinary.com')) {
        return url;
    }

    // Transform Cloudinary URL to use thumbnail with fill crop mode
    return url.replace('/upload/', `/upload/w_${width},c_fill,q_auto,f_auto/`);
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
        const { userId, imageId, mediaType, title, description, tags } = params;

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

        await api.patch(`/api/gallery/${userId}/${imageId}`, body, {
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
