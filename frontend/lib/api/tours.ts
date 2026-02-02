import { api, serverApi, handleApiError, createFormData, extractResponseData } from './apiClient';
import { AxiosError } from 'axios';

/**
 * Tour API Methods
 * Migrated from dashboard/src/http/tourApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

export interface TourPagination {
    currentPage: number;
    totalPages: number;
    totalTours: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
}

export interface ToursResponse {
    items: any[];
    nextCursor?: number;
    pagination: TourPagination;
    currentPage: number;
    totalPages: number;
    totalTours: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

/**
 * Get paginated tours list
 * Supports infinite scroll with cursor-based pagination
 */
export const getTours = async ({
    pageParam = 0,
    limit = 6
}: {
    pageParam?: number;
    limit?: number;
}): Promise<ToursResponse> => {
    const url = `/tours?page=${pageParam + 1}&limit=${limit}`;

    try {
        const response = await api.get(url, { timeout: 15000 });
        const data = extractResponseData(response);

        if (!data) {
            throw new Error('Invalid response format: No data received');
        }

        // Handle nested data structure (data.data.tours) - after extractResponseData
        if ((data as any)?.data?.tours) {
            const { tours: toursData, pagination } = (data as any).data;
            return {
                items: toursData,
                nextCursor: pagination.hasNextPage ? pagination.currentPage : undefined,
                pagination,
                currentPage: pagination.currentPage,
                totalPages: pagination.totalPages,
                totalTours: pagination.totalTours,
                hasNextPage: pagination.hasNextPage,
                hasPrevPage: pagination.hasPrevPage
            };
        }

        // Check if response has tours at root level
        if ((data as any)?.tours) {
            const toursData = (data as any).tours;
            const pagination = (data as any).pagination;
            return {
                items: toursData,
                nextCursor: pagination?.hasNextPage ? pagination.currentPage : undefined,
                pagination: pagination || {},
                currentPage: pagination?.currentPage || pageParam + 1,
                totalPages: pagination?.totalPages || 1,
                totalTours: pagination?.totalTours || toursData.length,
                hasNextPage: pagination?.hasNextPage || false,
                hasPrevPage: pagination?.hasPrevPage || false
            };
        }

        // Check if data array is directly available
        if (Array.isArray(data)) {
            const tours = data;
            return {
                items: tours,
                nextCursor: pageParam + 1,
                pagination: {
                    currentPage: pageParam,
                    totalPages: response.data.totalPages || Math.ceil((tours.length || 0) / limit),
                    totalTours: response.data.totalTours || tours.length,
                    hasNextPage: response.data.hasNextPage !== undefined ? response.data.hasNextPage : tours.length >= limit,
                    hasPrevPage: pageParam > 0,
                    limit
                },
                currentPage: pageParam,
                totalPages: response.data.totalPages || Math.ceil((tours.length || 0) / limit),
                totalTours: response.data.totalTours || tours.length,
                hasNextPage: response.data.hasNextPage !== undefined ? response.data.hasNextPage : tours.length >= limit,
                hasPrevPage: pageParam > 0
            };
        }

        throw new Error('Invalid response format: Could not find tours array');
    } catch (error) {
        throw handleApiError(error, 'fetching tours');
    }
};

/**
 * Get current user's tours (uses httpOnly cookie for auth)
 * - Admin: Returns all tours
 * - Seller/User: Returns only their own tours
 * Supports pagination
 */
export const getMyTours = async ({
    pageParam = 0,
    limit = 10
}: {
    pageParam?: number;
    limit?: number;
} = {}): Promise<ToursResponse> => {
    try {
        // Convert limit >= 100 to "all" for hybrid memory-friendly API
        const limitParam = limit >= 100 ? 'all' : limit;
        const url = `/tours/me?page=${pageParam + 1}&limit=${limitParam}`;
        const response = await api.get(url, { timeout: 30000 }); // Increased timeout for large datasets
        const data = extractResponseData(response);

        if (!data) {
            throw new Error('Invalid response format: No data received');
        }

        // Standard format from sendPaginatedResponse: { data: T[], pagination: {...} }
        const responseData = data as { items?: unknown[]; data?: unknown[]; pagination?: any; tours?: unknown[] };
        if (responseData.pagination) {
            const tours = (responseData.items || responseData.data || responseData.tours || []) as unknown[];
            const pagination = responseData.pagination;
            return {
                items: tours,
                nextCursor: pagination.currentPage < pagination.totalPages ? pagination.currentPage : undefined,
                pagination: {
                    currentPage: pagination.currentPage - 1, // Convert to 0-indexed
                    totalPages: pagination.totalPages,
                    totalTours: pagination.totalItems,
                    hasNextPage: pagination.currentPage < pagination.totalPages,
                    hasPrevPage: pagination.currentPage > 1,
                    limit: pagination.itemsPerPage
                },
                currentPage: pagination.currentPage - 1, // Convert to 0-indexed
                totalPages: pagination.totalPages,
                totalTours: pagination.totalItems,
                hasNextPage: pagination.currentPage < pagination.totalPages,
                hasPrevPage: pagination.currentPage > 1
            };
        }

        // Fallback: if data array is directly available without pagination
        if (Array.isArray(data)) {
            const tours = data as unknown[];
            return {
                items: tours,
                nextCursor: undefined,
                pagination: {
                    currentPage: pageParam,
                    totalPages: 1,
                    totalTours: tours.length,
                    hasNextPage: false,
                    hasPrevPage: false,
                    limit
                },
                currentPage: pageParam,
                totalPages: 1,
                totalTours: tours.length,
                hasNextPage: false,
                hasPrevPage: false
            };
        }

        throw new Error('Invalid response format: Could not find tours array');
    } catch (error) {
        throw handleApiError(error, 'fetching my tours');
    }
};

/**
 * Get user tour titles only (lightweight)
 */
export const getUserToursTitle = async (userId: string) => {
    try {
        const response = await api.get(`/users/${userId}/tours/titles`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user tour titles');
    }
};

/**
 * Resolve tour titles by tour IDs (auth required)
 * - Admin: resolves any provided IDs
 * - Seller/User: resolves only titles for tours they own
 */
export const getTourTitlesByIds = async (ids: string[]) => {
    try {
        const response = await api.post('/tours/titles', { ids });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tour titles');
    }
};

/**
 * Get latest tours
 */
export const getLatestTours = async () => {
    try {
        const response = await api.get('/tours/latest');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching latest tours');
    }
};

/**
 * Get single tour by ID
 */
export const getSingleTour = async (tourId: string) => {
    try {
        const response = await api.get(`/tours/${tourId}`);
        const data = extractResponseData(response);
        const tourData = (data as any).tour || data;
        const breadcrumbs = (data as any).breadcrumbs || [];

        return {
            ...tourData,
            breadcrumbs,
        };
    } catch (error) {
        throw handleApiError(error, 'fetching tour');
    }
};

/**
 * Get single tour by ID (alias for getSingleTour)
 */
export const getTourById = async (tourId: string) => {
    return getSingleTour(tourId);
};

/**
 * Create a new tour
 * Uses multipart/form-data for file uploads
 */
export const createTour = async (data: FormData) => {
    try {
        const response = await api.post('/tours', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'creating tour');
    }
};

/**
 * Update an existing tour
 * Uses multipart/form-data for file uploads
 */
export const updateTour = async (tourId: string, data: FormData) => {
    try {
        const response = await api.patch(`/tours/${tourId}`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating tour');
    }
};

/**
 * Delete a tour
 */
export const deleteTour = async (tourId: string) => {
    if (!tourId || tourId.trim() === '') {
        throw new Error('Tour ID is required for deletion');
    }
    try {
        const response = await api.delete(`/tours/${tourId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting tour');
    }
};

/**
 * Search tours with filters
 */
export const searchTours = async (query: string) => {
    try {
        const response = await api.get(`/api/tour-search?${query}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'searching tours');
    }
};

/**
 * Server-side tour fetching (for SSR/SSG)
 */
export const getToursServer = async (params?: {
    page?: number;
    limit?: number;
}) => {
    try {
        const response = await serverApi.get('/tours', { params });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tours (server)');
    }
};

export const getSingleTourServer = async (tourId: string) => {
    try {
        const response = await serverApi.get(`/tours/${tourId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tour (server)');
    }
};
