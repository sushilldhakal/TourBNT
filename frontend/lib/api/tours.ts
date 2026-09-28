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
    data: unknown[];
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

        // Standard sendPaginatedResponse: { items: [...], pagination: { page, limit, totalItems, totalPages } }
        // (server/src/utils/apiResponse.ts serializes the array under `items`,
        // not `data` — check that first; keep `data` as a defensive fallback
        // in case a caller changes shape later.)
        const raw = data as { items?: unknown[]; data?: unknown[]; pagination?: { page: number; limit: number; totalItems: number; totalPages: number } };
        if ((Array.isArray(raw?.items) || Array.isArray(raw?.data)) && raw?.pagination) {
            const toursData = (Array.isArray(raw.items) ? raw.items : raw.data) as unknown[];
            const p = raw.pagination;
            const currentPage = p.page ?? 1;
            const totalPages = p.totalPages ?? 1;
            const totalItems = p.totalItems ?? toursData.length;
            const hasNextPage = currentPage < totalPages;
            return {
                data: toursData,
                nextCursor: hasNextPage ? currentPage + 1 : undefined,
                pagination: {
                    currentPage,
                    totalPages,
                    totalTours: totalItems,
                    hasNextPage,
                    hasPrevPage: currentPage > 1,
                    limit: p.limit ?? limit,
                },
                currentPage,
                totalPages,
                totalTours: totalItems,
                hasNextPage,
                hasPrevPage: currentPage > 1,
            };
        }

        // Handle nested data structure (data.data.tours) - after extractResponseData
        if ((data as any)?.data?.tours) {
            const { tours: toursData, pagination } = (data as any).data;
            return {
                data: toursData,
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
                data: toursData,
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
                data: tours,
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

        // Standard format from sendPaginatedResponse: { items: T[], message, pagination: { page, limit, totalItems, totalPages } }
        const responseData = data as { items?: unknown[]; data?: unknown[]; pagination?: any; tours?: unknown[] };
        if (responseData.pagination) {
            const tours = (responseData.items ?? responseData.data ?? responseData.tours ?? []) as unknown[];
            const pagination = responseData.pagination;
            return {
                data: tours,
                nextCursor: pagination.currentPage < pagination.totalPages ? pagination.currentPage : undefined,
                pagination: {
                    currentPage: pagination.currentPage - 1, // Convert to 0-indexed
                    totalPages: pagination.totalPages,
                    totalTours: pagination.totalItems,
                    hasNextPage: pagination.currentPage < pagination.totalPages,
                    hasPrevPage: pagination.currentPage > 1,
                    limit: pagination.limit ?? pagination.itemsPerPage
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
                data: tours,
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
        // The registered route is GET /tours/user/:userId/titles (see
        // tourRouter.ts) — this used to point at a path that never existed.
        const response = await api.get(`/tours/user/${userId}/titles`);
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
 * Get single tour by ID.
 * Options.include: request relatedData sections (author, destination, categories, similarTours, pricingInsights, availability).
 * When omitted, server returns default relatedData for edit (author, destination, categories).
 * Returns data in shape { tour, relatedData?, breadcrumbs?, meta? }.
 */
export const getSingleTour = async (
    tourId: string,
    options?: { include?: string[] }
): Promise<{ tour: any; relatedData?: any; breadcrumbs?: { label: string; url: string }[]; meta?: any }> => {
    try {
        const query =
            options?.include && options.include.length > 0
                ? `?include=${options.include.join(',')}`
                : '';
        const response = await api.get(`/tours/${tourId}${query}`);
        const raw = extractResponseData(response) as { data?: any; tour?: any; breadcrumbs?: any[] };
        const data = raw?.data ?? raw;
        if (data?.tour) {
            return {
                tour: data.tour,
                relatedData: data.relatedData,
                breadcrumbs: data.breadcrumbs,
                meta: data.meta,
            };
        }
        return {
            tour: data?.tour ?? data,
            breadcrumbs: data?.breadcrumbs ?? [],
            relatedData: data?.relatedData,
            meta: data?.meta,
        };
    } catch (error) {
        throw handleApiError(error, 'fetching tour');
    }
};

/**
 * Get single tour by ID (alias for getSingleTour)
 */
export const getTourById = async (
    tourId: string,
    options?: { include?: string[] }
) => {
    return getSingleTour(tourId, options);
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
 * Search tours with filters (query string form - for backward compatibility)
 */
export const searchTours = async (query: string) => {
    try {
        const response = await api.get(`/tour-search?${query}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'searching tours');
    }
};

/**
 * Search tours with params (keyword, category, etc.)
 * Backend: GET /tour-search?keyword=...&category=...&page=1&limit=10
 */
export const getTourSearch = async (params: {
    keyword?: string;
    category?: string;
    page?: number;
    limit?: number;
}) => {
    try {
        const response = await api.get('/tour-search', { params });
        const data = extractResponseData(response);
        const items = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
        const pagination = (data as { pagination?: { totalItems?: number; totalPages?: number } })?.pagination;
        return { items, pagination };
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
