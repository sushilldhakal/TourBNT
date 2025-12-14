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
    const url = `/api/tours?page=${pageParam + 1}&limit=${limit}`;

    try {
        const response = await api.get(url, { timeout: 15000 });

        if (!response.data) {
            throw new Error('Invalid response format: No data received');
        }

        // Handle nested data structure (data.data.data.tours)
        if (response.data?.data?.data?.tours) {
            const { tours: toursData, pagination } = response.data.data.data;
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

        // Check if response has data.data.tours
        if (response?.data?.data?.tours) {
            const toursData = response.data.data.tours;
            const { pagination } = response.data.data;
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

        // Check if response has data.tours
        if (response?.data?.tours) {
            const toursData = response.data.tours;
            const { pagination } = response.data;
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

        // Check if data array is directly available
        if (response?.data?.success && Array.isArray(response?.data?.data)) {
            const tours = response.data.data;
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
 * Get tours by user ID
 */
export const getUsersTours = async (userId: string) => {
    try {
        const response = await api.get(`/api/users/${userId}/tours`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user tours');
    }
};

/**
 * Get user tour titles only (lightweight)
 */
export const getUserToursTitle = async (userId: string) => {
    try {
        const response = await api.get(`/api/users/${userId}/tours/titles`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user tour titles');
    }
};

/**
 * Get latest tours
 */
export const getLatestTours = async () => {
    try {
        const response = await api.get('/api/tours/latest');
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
        const response = await api.get(`/api/tours/${tourId}`);
        const tourData = response.data.tour || response.data;
        const breadcrumbs = response.data.breadcrumbs || [];

        return {
            ...tourData,
            breadcrumbs,
        };
    } catch (error) {
        throw handleApiError(error, 'fetching tour');
    }
};

/**
 * Create a new tour
 * Uses multipart/form-data for file uploads
 */
export const createTour = async (data: FormData) => {
    try {
        const response = await api.post('/api/tours', data, {
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
        const response = await api.patch(`/api/tours/${tourId}`, data, {
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
    try {
        const response = await api.delete(`/api/tours/${tourId}`);
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
        const response = await serverApi.get('/api/tours', { params });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tours (server)');
    }
};

export const getSingleTourServer = async (tourId: string) => {
    try {
        const response = await serverApi.get(`/api/tours/${tourId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tour (server)');
    }
};
