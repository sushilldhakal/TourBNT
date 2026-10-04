import { api, handleApiError, extractResponseData } from './apiClient';
import type { EntityUsage } from './categories';

/**
 * Destination API
 * All destination-related API calls. Single source of truth.
 */

export const destinationApi = {
    getApproved: (params?: { page?: number; limit?: number; country?: string; region?: string; search?: string }) =>
        api.get('/global/destinations', { params }),
    getByCountry: (country: string) =>
        api.get(`/global/destinations/country/${country}`),
    search: (params: { query?: string; country?: string; region?: string; city?: string }) =>
        api.get('/global/destinations/search', { params }),
    create: (data: {
        name: string;
        description: string;
        country: string;
        region?: string;
        city?: string;
        coverImage?: string;
        coordinates?: { latitude: number; longitude: number };
        metadata?: Record<string, unknown>;
    }) =>
        api.post('/global/destinations', data),
    update: (id: string, data: unknown) =>
        api.patch(`/global/destinations/${id}`, data),
    getMyCreated: () =>
        api.get('/global/destinations/my-created'),
    getMyDestinations: (filters?: { isActive?: boolean; isFavorite?: boolean }) =>
        api.get('/global/destinations/user-destinations', { params: filters }),
    getMyActive: () =>
        api.get('/global/destinations/seller/enabled'),
    getMyFavorites: () =>
        api.get('/global/destinations/seller/favorites'),
    // These previously called paths/methods that don't exist on the server
    // (POST .../add, DELETE .../remove, PATCH .../toggle-favorite) — aligned
    // to the routes that are actually registered.
    addToMyList: (id: string, options?: { isFavorite?: boolean; customName?: string }) =>
        api.post(`/global/destinations/${id}/add-to-list`, options),
    removeFromMyList: (id: string) =>
        api.post(`/global/destinations/${id}/remove-from-list`),
    toggleActive: (id: string) =>
        api.patch(`/global/destinations/${id}/toggle-active`),
    toggleFavorite: (id: string) =>
        api.put(`/global/destinations/${id}/favorite`),
    updateSettings: (id: string, settings: { isActive?: boolean; isFavorite?: boolean; customName?: string; sortOrder?: number }) =>
        api.patch(`/global/destinations/${id}/settings`, settings),
    bulkUpdate: (updates: Array<{ destinationId: string; sortOrder?: number; isActive?: boolean; isFavorite?: boolean }>) =>
        api.post('/global/destinations/bulk-update', { updates }),
    adminGetAll: (filters?: { approvalStatus?: string; country?: string }) =>
        api.get('/global/destinations/admin/all', { params: filters }),
    adminGetPending: () =>
        api.get('/global/destinations/admin/pending'),
    adminApprove: (id: string) =>
        api.put(`/global/destinations/admin/${id}/approve`),
    adminReject: (id: string, reason: string) =>
        api.put(`/global/destinations/admin/${id}/reject`, { reason }),
    adminDelete: (id: string) =>
        api.delete(`/global/destinations/admin/${id}`),
    // Change requests (admin only)
    adminGetChangeRequests: () =>
        api.get('/global/destinations/admin/change-requests'),
    adminApproveChangeRequest: (changeRequestId: string) =>
        api.put(`/global/destinations/admin/change-requests/${changeRequestId}/approve`),
    adminRejectChangeRequest: (changeRequestId: string, reason: string) =>
        api.put(`/global/destinations/admin/change-requests/${changeRequestId}/reject`, { reason }),
};

export const getUserDestinations = async () => {
    try {
        const response = await destinationApi.getMyDestinations();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user destinations');
    }
};

export const getAllDestinations = async () => {
    try {
        const response = await destinationApi.getApproved();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching destinations');
    }
};

export const getDestination = async (destinationId: string) => {
    try {
        const response = await api.get(`/global/destinations/public/${destinationId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching destination');
    }
};

export const getDestinationById = async (destinationId: string) => getDestination(destinationId);

export const toggleDestinationFavorite = async (destinationId: string) => {
    try {
        const response = await destinationApi.toggleFavorite(destinationId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'toggling destination favorite');
    }
};

export const toggleDestinationActiveStatus = async (destinationId: string) => {
    try {
        const response = await destinationApi.toggleActive(destinationId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'toggling destination active');
    }
};

export const addExistingDestinationToSeller = async (destinationId: string) => {
    if (!destinationId || destinationId === 'undefined' || destinationId === 'null' || destinationId.trim() === '') {
        throw new Error('Invalid destination ID: destinationId is required and cannot be undefined, null, or empty');
    }
    try {
        const response = await destinationApi.addToMyList(destinationId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding destination to list');
    }
};

export const removeExistingDestinationFromSeller = async (destinationId: string) => {
    try {
        const response = await destinationApi.removeFromMyList(destinationId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'removing destination from list');
    }
};

export const addDestination = async (destinationData: FormData) => {
    try {
        const response = await api.post('/global/destinations', destinationData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding destination');
    }
};

export const updateDestination = async (destinationId: string, destinationData: FormData) => {
    try {
        const response = await api.patch(`/global/destinations/${destinationId}`, destinationData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating destination');
    }
};

export const deleteDestination = async (destinationId: string) => {
    try {
        const response = await destinationApi.adminDelete(destinationId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting destination');
    }
};

/** Admin-only: how many sellers have this destination in their profile, and which tours use it — shown before deleting. */
export const getDestinationUsage = async (destinationId: string) => {
    try {
        const response = await api.get(`/global/destinations/admin/${destinationId}/usage`);
        return extractResponseData<EntityUsage>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching destination usage');
    }
};

export const getPendingDestinations = async () => {
    try {
        const response = await destinationApi.adminGetPending();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching pending destinations');
    }
};

export const approveDestination = async (destinationId: string) => {
    try {
        const response = await destinationApi.adminApprove(destinationId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'approving destination');
    }
};

export const rejectDestination = async (destinationId: string, reason: string) => {
    try {
        const response = await destinationApi.adminReject(destinationId, reason);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'rejecting destination');
    }
};

// Change request functions (admin only)
export const getChangeRequests = async () => {
    try {
        const response = await destinationApi.adminGetChangeRequests();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching change requests');
    }
};

export const approveChangeRequest = async (changeRequestId: string) => {
    try {
        const response = await destinationApi.adminApproveChangeRequest(changeRequestId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'approving change request');
    }
};

export const rejectChangeRequest = async (changeRequestId: string, reason: string) => {
    try {
        const response = await destinationApi.adminRejectChangeRequest(changeRequestId, reason);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'rejecting change request');
    }
};

export const searchDestinations = async (searchParams: { query?: string; country?: string; region?: string; city?: string }) => {
    try {
        const response = await destinationApi.search(searchParams);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'searching destinations');
    }
};

export const getMyActiveDestinations = async () => {
    try {
        const response = await destinationApi.getMyActive();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching active destinations');
    }
};

export const getMyFavoriteDestinations = async () => {
    try {
        const response = await destinationApi.getMyFavorites();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching favorite destinations');
    }
};

export const getMyCreatedDestinations = async () => {
    try {
        const response = await destinationApi.getMyCreated();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching created destinations');
    }
};

export const updateDestinationSettings = async (
    destinationId: string,
    settings: { customName?: string; isFavorite?: boolean; isActive?: boolean }
) => {
    try {
        const response = await destinationApi.updateSettings(destinationId, settings);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating destination settings');
    }
};

export const bulkUpdateDestinations = async (
    updates: Array<{ destinationId: string; isActive?: boolean; isFavorite?: boolean; customName?: string }>
) => {
    try {
        const response = await destinationApi.bulkUpdate(updates);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'bulk updating destinations');
    }
};

export const getAllDestinationsAdmin = async () => {
    try {
        const response = await destinationApi.adminGetAll();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching all destinations (admin)');
    }
};

export const getUserToursTitle = async (userId: string) => {
    try {
        const response = await api.get(`/tours/user/${userId}/titles`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tour titles');
    }
};


/** A global destination offered to a seller to add. */
export interface AvailableDestination {
    id: string;
    name: string;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    coverImage?: string | null;
}

/** Approved destinations the seller doesn't have yet — server-side search + paging. */
export const getAvailableDestinationsPage = async (params: { search?: string; page: number; limit: number }) => {
    try {
        const response = await api.get('/global/destinations/available', { params });
        const body = response.data as { data?: AvailableDestination[]; pagination?: { totalItems: number; totalPages: number } };
        return { items: body.data ?? [], totalItems: body.pagination?.totalItems ?? 0, totalPages: body.pagination?.totalPages ?? 1 };
    } catch (error) {
        throw handleApiError(error, 'fetching available destinations');
    }
};

/** Add many (or ALL matching) to the seller's list in a single request. */
export const bulkAddDestinations = async (payload: { ids?: string[]; all?: boolean; search?: string }) => {
    try {
        const response = await api.post('/global/destinations/bulk-add', payload);
        return response.data.data as { added: number; alreadyHad: number; total: number };
    } catch (error) {
        throw handleApiError(error, 'adding destinations to list');
    }
};
