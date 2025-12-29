import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Destination API Methods
 * Migrated from dashboard/src/http/destinationApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

export interface DestinationData {
    _id: string;
    name: string;
    description: string;
    image?: string;
    isActive: boolean;
    isApproved: boolean;
    approvalStatus: string;
    usageCount: number;
}

/**
 * Get all destinations for seller
 */
export const getSellerDestinations = async () => {
    try {
        const response = await api.get('/global/destinations/seller/visible');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching seller destinations');
    }
};

/**
 * Get user-specific destinations
 */
export const getUserDestinations = async () => {
    try {
        const response = await api.get('/global/destinations/user-destinations');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user destinations');
    }
};

/**
 * Get all approved destinations
 */
export const getAllDestinations = async () => {
    try {
        const response = await api.get('/global/destinations/approved');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching destinations');
    }
};

/**
 * Get single destination by ID
 */
export const getDestination = async (destinationId: string) => {
    try {
        const response = await api.get(`/global/destinations/${destinationId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching destination');
    }
};

/**
 * Get single destination by ID (alias for getDestination)
 */
export const getDestinationById = async (destinationId: string) => {
    return getDestination(destinationId);
};

/**
 * Toggle destination favorite status
 */
export const toggleDestinationFavorite = async (destinationId: string) => {
    try {
        const response = await api.patch(`/global/destinations/${destinationId}/favorite`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'toggling destination favorite');
    }
};

/**
 * Toggle destination active status
 */
export const toggleDestinationActiveStatus = async (destinationId: string) => {
    try {
        const response = await api.patch(`/global/destinations/${destinationId}/toggle-active`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'toggling destination status');
    }
};

/**
 * Add existing destination to seller list
 */
export const addExistingDestinationToSeller = async (destinationId: string) => {
    try {
        const response = await api.post(`/global/destinations/${destinationId}/add-to-list`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding destination to list');
    }
};

/**
 * Remove destination from seller list
 */
export const removeExistingDestinationFromSeller = async (destinationId: string) => {
    try {
        const response = await api.post(`/global/destinations/${destinationId}/remove-from-list`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'removing destination from list');
    }
};

/**
 * Add new destination
 */
export const addDestination = async (destinationData: FormData) => {
    try {
        const response = await api.post('/global/destinations/submit', destinationData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding destination');
    }
};

/**
 * Update destination
 */
export const updateDestination = async (destinationId: string, destinationData: FormData) => {
    try {
        const response = await api.patch(`/global/destinations/${destinationId}`, destinationData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating destination');
    }
};

/**
 * Delete destination (admin only)
 */
export const deleteDestination = async (destinationId: string) => {
    try {
        const response = await api.delete(`/global/destinations/admin/${destinationId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting destination');
    }
};

/**
 * Get pending destinations (admin)
 */
export const getPendingDestinations = async () => {
    try {
        const response = await api.get('/global/destinations/admin/pending');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching pending destinations');
    }
};

/**
 * Approve destination (admin)
 */
export const approveDestination = async (destinationId: string) => {
    try {
        const response = await api.put(`/global/destinations/admin/${destinationId}/approve`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'approving destination');
    }
};

/**
 * Reject destination (admin)
 */
export const rejectDestination = async (destinationId: string, reason: string) => {
    try {
        const response = await api.put(`/global/destinations/admin/${destinationId}/reject`, { reason });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'rejecting destination');
    }
};

/**
 * Search destinations
 */
export const searchDestinations = async (searchParams: {
    query?: string;
    country?: string;
    region?: string;
    city?: string;
}) => {
    try {
        const params = new URLSearchParams();
        if (searchParams.query) params.append('query', searchParams.query);
        if (searchParams.country) params.append('country', searchParams.country);
        if (searchParams.region) params.append('region', searchParams.region);
        if (searchParams.city) params.append('city', searchParams.city);

        const response = await api.get(`/global/destinations/seller/search?${params.toString()}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'searching destinations');
    }
};

/**
 * Get user's tour titles (for featured tours selection)
 */
export const getUserToursTitle = async (userId: string) => {
    try {
        const response = await api.get(`/users/${userId}/tours/titles`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tour titles');
    }
};
