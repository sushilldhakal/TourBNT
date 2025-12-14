import { api, serverApi, handleApiError } from './apiClient';
import { TourResponse } from '../types';

/**
 * Fetch tours with pagination support
 * Handles multiple response formats from different server configurations
 * 
 * @param page - Page number (1-indexed)
 * @param limit - Number of tours per page
 * @returns Tours data in useInfiniteQuery-compatible format
 */
export const getTours = async ({ page = 1, limit = 12 }: { page?: number; limit?: number } = {}) => {
    try {
        const response = await api.get<TourResponse>('/api/tours', {
            params: { page, limit },
            timeout: 15000, // 15 seconds timeout
        });

        const data = response.data;

        // Handle Format 1: items with cursor-based pagination
        if (data.items) {
            return {
                tours: data.items,
                nextPage: data.nextCursor ? page + 1 : undefined,
                hasNextPage: !!data.nextCursor,
            };
        }

        // Handle Format 2: pagination object with tours array
        if (data.pagination && data.tours) {
            return {
                tours: data.tours,
                nextPage: data.pagination.hasNextPage ? page + 1 : undefined,
                hasNextPage: data.pagination.hasNextPage,
            };
        }

        // Handle Format 3: success with data array directly
        if (data.success && Array.isArray(data.data)) {
            const hasNext = data.pagination?.currentPage && data.pagination?.totalPages
                ? data.pagination.currentPage < data.pagination.totalPages
                : false;
            return {
                tours: data.data,
                nextPage: hasNext ? page + 1 : undefined,
                hasNextPage: hasNext,
            };
        }

        // Handle Format 4: success with data wrapper containing tours
        if (data.success && data.data && typeof data.data === 'object' && 'tours' in data.data) {
            const dataWithTours = data.data as { tours: any[]; pagination?: { hasNextPage: boolean } };
            return {
                tours: dataWithTours.tours,
                nextPage: dataWithTours.pagination?.hasNextPage ? page + 1 : undefined,
                hasNextPage: dataWithTours.pagination?.hasNextPage ?? false,
            };
        }

        // Handle Format 5: direct tours array
        if ('tours' in data && Array.isArray(data.tours)) {
            return {
                tours: data.tours,
                nextPage: undefined,
                hasNextPage: false,
            };
        }

        // Fallback: empty result
        return {
            tours: [],
            nextPage: undefined,
            hasNextPage: false,
        };
    } catch (error) {
        handleApiError(error, 'fetching tours');
        // Return empty result on error (handleApiError throws, but TypeScript needs this)
        return {
            tours: [],
            nextPage: undefined,
            hasNextPage: false,
        };
    }
};

/**
 * Fetch a single tour by ID
 * Uses the public /api/tours/{id} endpoint
 * Server-side uses serverApi (no auth), client-side uses api (with auth if available)
 * 
 * @param tourId - Tour ID
 * @returns Tour data
 */
export const getTourById = async (tourId: string) => {
    try {
        const timestamp = new Date().getTime();
        // Use serverApi on server-side (no auth interceptor), api on client-side
        const apiClient = typeof window === 'undefined' ? serverApi : api;

        const response = await apiClient.get(`/api/tours/${tourId}?_t=${timestamp}`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 15000,
        });

        // Handle response structure - tour data might be nested
        return response.data.tour || response.data;
    } catch (error) {
        handleApiError(error, 'fetching tour');
    }
};

/**
 * Fetch latest tours for related tours section
 * Uses the public /api/tours/latest endpoint
 * Server-side uses serverApi (no auth), client-side uses api (with auth if available)
 * 
 * @returns Latest tours data
 */
export const getLatestTours = async () => {
    try {
        // Use serverApi on server-side (no auth interceptor), api on client-side
        const apiClient = typeof window === 'undefined' ? serverApi : api;

        const response = await apiClient.get('/api/tours/latest', {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching latest tours');
    }
};
