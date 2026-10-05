import { api, serverApi, handleApiError, extractResponseData, extractList } from './apiClient';
import type { RelatedData, Tour } from '@/types/types';

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
    data: Tour[];
    /** 0-based page index of the next page, when there is one. */
    nextCursor?: number;
    pagination: TourPagination;
    currentPage: number;
    totalPages: number;
    totalTours: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

/** One page of a sendPaginatedResponse list ({ items, pagination: { page, limit, totalItems, totalPages } }). */
interface PagedTours {
    items?: Tour[];
    data?: Tour[];
    pagination?: { page?: number; limit?: number; totalItems?: number | null; totalPages?: number | null };
}

/** A list response as ToursResponse; `pageParam` is the 0-based page that was asked for. */
function toToursResponse(body: PagedTours | Tour[] | null | undefined, pageParam: number, limit: number): ToursResponse {
    if (!body) throw new Error('Invalid response format: No data received');
    const tours = Array.isArray(body) ? body : body.items ?? body.data;
    if (!Array.isArray(tours)) throw new Error('Invalid response format: Could not find tours array');
    const p = Array.isArray(body) ? undefined : body.pagination;
    // currentPage is 1-based, like the server's page.
    const currentPage = p?.page ?? pageParam + 1;
    const totalPages = p?.totalPages ?? (tours.length < limit ? currentPage : currentPage + 1);
    const totalTours = p?.totalItems ?? tours.length;
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
    return {
        data: tours,
        nextCursor: hasNextPage ? currentPage : undefined,
        pagination: { currentPage, totalPages, totalTours, hasNextPage, hasPrevPage, limit: p?.limit ?? limit },
        currentPage,
        totalPages,
        totalTours,
        hasNextPage,
        hasPrevPage,
    };
}

/**
 * Get paginated tours list
 * Supports infinite scroll with cursor-based pagination
 */
/** Filters for the public tour list, applied by the server (GET /tours/search). Ids, not names. */
export interface TourListFilters {
    keyword?: string;
    destination?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    /** YYYY-MM-DD: tours with a departure (or availability) between these dates. */
    startDate?: string;
    endDate?: string;
}

export const hasTourListFilters = (f?: TourListFilters) =>
    !!f && Object.values(f).some((v) => v !== undefined && v !== '' && v !== null);

export const getTours = async ({
    pageParam = 0,
    limit = 6,
    filters,
}: {
    pageParam?: number;
    limit?: number;
    /** With filters the server searches every tour (not just one loaded page); same response shape. */
    filters?: TourListFilters;
}): Promise<ToursResponse> => {
    const query = new URLSearchParams({ page: String(pageParam + 1), limit: String(limit) });
    if (hasTourListFilters(filters)) {
        for (const [k, v] of Object.entries(filters!)) if (v !== undefined && v !== '' && v !== null) query.set(k, String(v));
    }
    const url = `${hasTourListFilters(filters) ? '/tours/search' : '/tours'}?${query.toString()}`;

    try {
        const response = await api.get(url, { timeout: 15000 });
        return toToursResponse(extractResponseData<PagedTours | Tour[]>(response), pageParam, limit);
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
        // The server caps page size at 100; larger requests page through it.
        const limitParam = Math.min(limit, 100);
        const url = `/tours/me?page=${pageParam + 1}&limit=${limitParam}`;
        const response = await api.get(url, { timeout: 30000 }); // Increased timeout for large datasets
        return toToursResponse(extractResponseData<PagedTours | Tour[]>(response), pageParam, limitParam);
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
/** GET /tours/:id: the tour plus whatever related data was asked for. */
export interface SingleTourResponse {
    tour: Tour;
    relatedData?: RelatedData;
    breadcrumbs?: { label: string; url: string }[];
    meta?: Record<string, unknown>;
}

export const getSingleTour = async (
    tourId: string,
    options?: { include?: string[]; cookie?: string }
): Promise<SingleTourResponse> => {
    try {
        const query =
            options?.include && options.include.length > 0
                ? `?include=${options.include.join(',')}`
                : '';
        const response = await api.get(`/tours/${tourId}${query}`, {
            headers: options?.cookie ? { Cookie: options.cookie } : undefined,
        });
        const raw = extractResponseData(response) as SingleTourResponse & { data?: SingleTourResponse };
        const data: SingleTourResponse = raw?.data ?? raw;
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
    options?: { include?: string[]; cookie?: string }
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
export type ItineraryRequestStatusValue = 'pending' | 'held' | 'confirmed' | 'countered' | 'declined' | 'expired';

export interface ItineraryRequestEvent {
    id: string;
    fromStatus: ItineraryRequestStatusValue | null;
    toStatus: ItineraryRequestStatusValue;
    actorRole: 'agency' | 'partner' | 'system';
    unitsAtEvent?: number | null;
    notes?: string | null;
    createdAt: string;
}

export interface TourItineraryRequestStatus {
    /** null for a linked partner with no request sent yet — the agency table shows these with a "Send request" action. */
    id: string | null;
    tourId: string;
    tourItineraryPartnerId: string;
    businessPartnerId: string | null;
    partnerName: string;
    partnerType: string;
    role: 'transport' | 'accommodation' | 'guide' | 'meals' | 'other';
    serviceDate: string | null;
    serviceTime?: string | null;
    headcount: number;
    unitsRequested: number;
    unitType?: string | null;
    status: ItineraryRequestStatusValue | null;
    capacityConfirmed?: number | null;
    responseNotes?: string | null;
    holdExpiresAt?: string | null;
    respondByAt?: string | null;
    counterUnits?: number | null;
    counterDate?: string | null;
    counterTime?: string | null;
    counterNotes?: string | null;
    sourceDepartureDate?: string | null;
    events: ItineraryRequestEvent[];
    /** Partner confirmed this request, then cancelled it. */
    withdrewAfterConfirm?: boolean;
}

export interface OpenSlotApplication {
    id: string;
    businessPartnerId: string;
    businessName: string;
    businessType: string;
    message: string | null;
    unitsOffered: number | null;
    status: 'applied' | 'selected' | 'declined' | 'withdrawn';
    serviceDate: string;
}

export interface TourOpenSlot {
    linkId: string;
    role: string;
    dayId: string;
    dayLabel: string;
    unitsRequested: number | null;
    unitType: string | null;
    serviceDate: string | null;
    filled: boolean;
    selectedPartnerName: string | null;
    applications: OpenSlotApplication[];
}

/** Read-only per-day partner confirmation status for the tour editor. */
export const getTourLogisticsStatus = async (tourId: string) => {
    try {
        const response = await api.get(`/tours/${tourId}/logistics-status`);
        return extractList<TourItineraryRequestStatus>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching logistics status');
    }
};

/** Agency sends a request on demand for a day/role link that has no request yet. */
export const sendItineraryPartnerRequest = async (tourId: string, linkId: string, serviceDate: string, serviceTime?: string) => {
    try {
        const response = await api.post(`/tours/${tourId}/itinerary-partners/${linkId}/request`, { serviceDate, serviceTime });
        return extractResponseData<TourItineraryRequestStatus>(response);
    } catch (error) {
        throw handleApiError(error, 'sending itinerary partner request');
    }
};

/** Agency accepts or declines a partner's counter-offer. */
export const respondToItineraryCounterOffer = async (tourId: string, requestId: string, accept: boolean) => {
    try {
        const response = await api.patch(`/tours/${tourId}/itinerary-requests/${requestId}/counter-response`, { accept });
        return extractResponseData<TourItineraryRequestStatus>(response);
    } catch (error) {
        throw handleApiError(error, 'responding to counter-offer');
    }
};

/** Agency resurrects a declined/expired request back to pending. */
export const reopenItineraryPartnerRequest = async (tourId: string, requestId: string) => {
    try {
        const response = await api.post(`/tours/${tourId}/itinerary-requests/${requestId}/reopen`, {});
        return extractResponseData<TourItineraryRequestStatus>(response);
    } catch (error) {
        throw handleApiError(error, 'reopening itinerary request');
    }
};

/** Agency swaps the business partner linked to a day/role in place. */
export const getTourOpenSlots = async (tourId: string) => {
    try {
        const response = await api.get(`/tours/${tourId}/open-slots`);
        return extractList<TourOpenSlot>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching open slot applications');
    }
};

export const selectOpenSlotApplication = async (tourId: string, applicationId: string) => {
    try {
        const response = await api.post(`/tours/${tourId}/open-applications/${applicationId}/select`, {});
        return extractResponseData<{ requestId: string; businessName: string; serviceDate: string }>(response);
    } catch (error) {
        throw handleApiError(error, 'choosing an applicant');
    }
};

export const replaceItineraryPartner = async (tourId: string, linkId: string, businessPartnerId: string, name: string) => {
    try {
        const response = await api.patch(`/tours/${tourId}/itinerary-partners/${linkId}/replace`, { businessPartnerId, name });
        return extractResponseData<{ tourItineraryPartnerId: string; businessPartnerId: string; name: string }>(response);
    } catch (error) {
        throw handleApiError(error, 'replacing itinerary partner');
    }
};

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

export interface TourRouteStop {
    /** "2B", or just "7" when a day has a single stop. */
    label: string;
    day: number;
    kind: 'location' | 'meal' | 'stay';
    name: string;
    place: string;
    lat: number;
    lng: number;
    /** Meal / hotel with no stored location: drawn beside the day's town, not at its real address. */
    approximate?: boolean;
}

export interface TourRouteDay {
    day: number;
    title: string;
    place: string;
    stops: TourRouteStop[];
}

export interface TourRouteMapData {
    days: TourRouteDay[];
    /** Places still being looked up; the map fills in as they resolve. */
    pending: number;
    unresolved: string[];
}

/** Lettered day-by-day route (1A, 1B, 2A…) for the map on the tour page. Public. */
export const getTourRouteMap = async (tourId: string): Promise<TourRouteMapData> => {
    try {
        const response = await api.get(`/tours/${tourId}/route-map`, { timeout: 20000 });
        return extractResponseData(response) as TourRouteMapData;
    } catch (error) {
        throw handleApiError(error, 'fetching route map');
    }
};

export interface TourBusiness {
    /** Agency id, for linking to its page. */
    id: string;
    /** Company name (the account holder's name only if no company is on file). */
    name: string;
    description: string | null;
    phone: string | null;
    email: string;
    website: string | null;
    location: string | null;
    /** Weighted across every published tour the business runs; null until it has reviews. */
    rating: number | null;
    reviewCount: number;
    tourCount: number;
}

/** The business behind a tour, for the contact card on the tour page. Public. */
export const getTourBusiness = async (tourId: string): Promise<TourBusiness> => {
    try {
        const response = await api.get(`/tours/${tourId}/business`);
        return extractResponseData(response) as TourBusiness;
    } catch (error) {
        throw handleApiError(error, 'fetching business info');
    }
};

export interface Agency {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    rating: number | null;
    reviewCount: number;
    tourCount: number;
}

export interface AgencyDetail extends Agency {
    phone: string | null;
    email: string;
    website: string | null;
}

/** Public directory of agencies that currently run at least one published tour. */
export const getAgencies = async (params?: { page?: number; limit?: number; search?: string }) => {
    try {
        const response = await api.get('/agencies', { params });
        return extractResponseData(response) as { items: Agency[]; page: number; limit: number; totalItems: number; totalPages: number };
    } catch (error) {
        throw handleApiError(error, 'fetching agencies');
    }
};

/** One agency with its active (published) tours. Public. */
export const getAgencyById = async (agencyId: string) => {
    try {
        const response = await api.get(`/agencies/${agencyId}`);
        return extractResponseData(response) as { agency: AgencyDetail; tours: Tour[] };
    } catch (error) {
        throw handleApiError(error, 'fetching agency');
    }
};
