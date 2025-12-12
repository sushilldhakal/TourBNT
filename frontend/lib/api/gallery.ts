import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Gallery/Media API Methods
 * Migrated from dashboard/src/http/mediaApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

/**
 * Get all media with pagination
 */
export const getAllMedia = async ({
    pageParam = null,
    mediaType
}: {
    pageParam: number | null;
    mediaType: string;
}) => {
    try {
        const response = await api.get('/api/gallery/media', {
            params: {
                mediaType,
                page: pageParam,
                nextCursor: pageParam,
                pageSize: 10,
            },
        });
        return {
            resources: response.data[mediaType],
            nextCursor: response.data.nextCursor,
        };
    } catch (error) {
        throw handleApiError(error, 'fetching media');
    }
};

/**
 * Get single media by URL
 */
export const getSingleMedia = async (imageUrl: string, user: string | null) => {
    const publicId = extractPublicId(imageUrl);
    const userId = user || null;
    const mediaType = imageUrl.split('/').slice(-3).join('/');
    const resourcesType = mediaType.split('/')[1];

    try {
        const response = await api.get(`/api/gallery/${publicId}`, {
            params: { userId, resourcesType },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching media');
    }
};

/**
 * Extract public ID from Cloudinary URL
 */
export const extractPublicId = (url: string) => {
    const parts = url.split('/');
    const fileName = parts.pop();
    const publicId = fileName?.split('.')[0];
    return publicId;
};

/**
 * Upload media files
 * Uses multipart/form-data as per API_DOCUMENTATION.md
 */
export const addMedia = async (formData: FormData, userId: string) => {
    try {
        const response = await api.post(`/api/gallery/${userId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'uploading media');
    }
};

/**
 * Update media metadata
 */
export const updateMedia = async (
    formData: FormData,
    userId: string,
    imageId: string,
    mediaType: string
) => {
    try {
        const response = await api.patch(
            `/api/gallery/${userId}/${imageId}?mediaType=${mediaType}`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating media');
    }
};

/**
 * Delete media files
 */
export const deleteMedia = async (
    userId: string,
    imageIds: string | string[],
    mediaType: string
) => {
    try {
        const ids = Array.isArray(imageIds) ? imageIds : [imageIds];
        const response = await api.delete(`/api/gallery/${userId}`, {
            data: { imageIds: ids, mediaType },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting media');
    }
};
