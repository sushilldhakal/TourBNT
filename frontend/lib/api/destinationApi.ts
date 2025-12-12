import { api, handleApiError } from './apiClient';
import { Destination } from '../types';

/**
 * Get all approved destinations
 * Used for public-facing destination filtering
 * 
 * @returns Array of approved destinations
 */
export const getAllDestinations = async (): Promise<Destination[]> => {
    try {
        const response = await api.get('/api/global/destinations/approved');

        // Handle different response formats
        if (response.data.data) {
            return response.data.data;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        return [];
    } catch (error) {
        handleApiError(error, 'fetching destinations');
        return [];
    }
};

/**
 * Get a single destination by ID
 * 
 * @param destinationId - Destination ID
 * @returns Destination data
 */
export const getDestinationById = async (destinationId: string) => {
    try {
        const response = await api.get(`/api/global/destinations/${destinationId}`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching destination details');
    }
};

/**
 * Dashboard Destination Management APIs
 * For sellers and admins to manage destinations
 */

/**
 * Get all destinations (admin view)
 */
export const getSellerDestinations = async () => {
    try {
        const response = await api.get('/api/global/destinations/seller/visible');
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching seller destinations');
        throw error;
    }
};

/**
 * Get user's destinations (seller view)
 */
export const getUserDestinations = async () => {
    try {
        const response = await api.get('/api/global/destinations/user-destinations');
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching user destinations');
        throw error;
    }
};

/**
 * Get pending destinations (admin only)
 */
export const getPendingDestinations = async () => {
    try {
        const response = await api.get('/api/global/destinations/admin/pending');
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching pending destinations');
        throw error;
    }
};

/**
 * Search destinations
 */
export const searchDestinations = async (params: { query?: string } = {}) => {
    try {
        const response = await api.get('/api/global/destinations/seller/search', { params });
        return response.data;
    } catch (error) {
        handleApiError(error, 'searching destinations');
        throw error;
    }
};

/**
 * Add new destination
 */
export const addDestination = async (formData: FormData) => {
    try {
        const response = await api.post('/api/global/destinations/submit', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'adding destination');
        throw error;
    }
};

/**
 * Update destination
 */
export const updateDestination = async (destinationId: string, formData: FormData) => {
    try {
        const response = await api.patch(`/api/global/destinations/${destinationId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'updating destination');
        throw error;
    }
};

/**
 * Delete destination (admin only)
 */
export const deleteDestination = async (destinationId: string) => {
    try {
        const response = await api.delete(`/api/global/destinations/admin/${destinationId}`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'deleting destination');
        throw error;
    }
};

/**
 * Add existing destination to seller's list
 */
export const addExistingDestinationToSeller = async (destinationId: string) => {
    try {
        const response = await api.post(`/api/global/destinations/${destinationId}/add-to-list`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'adding existing destination');
        throw error;
    }
};

/**
 * Remove destination from seller's list
 */
export const removeExistingDestinationFromSeller = async (destinationId: string) => {
    try {
        const response = await api.post(`/api/global/destinations/${destinationId}/remove-from-list`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'removing destination');
        throw error;
    }
};

/**
 * Toggle destination active status
 */
export const toggleDestinationActiveStatus = async (destinationId: string) => {
    try {
        const response = await api.patch(`/api/global/destinations/${destinationId}/toggle-active`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'toggling destination status');
        throw error;
    }
};

/**
 * Approve destination (admin only)
 */
export const approveDestination = async (destinationId: string) => {
    try {
        const response = await api.put(`/api/global/destinations/admin/${destinationId}/approve`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'approving destination');
        throw error;
    }
};

/**
 * Reject destination (admin only)
 */
export const rejectDestination = async (destinationId: string, reason: string) => {
    try {
        const response = await api.put(`/api/global/destinations/admin/${destinationId}/reject`, { reason });
        return response.data;
    } catch (error) {
        handleApiError(error, 'rejecting destination');
        throw error;
    }
};

/**
 * Get user's tour titles (for featured tours selection)
 */
export const getUserToursTitle = async (userId: string) => {
    try {
        const response = await api.get(`/api/tours/user/${userId}/titles`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching tour titles');
        throw error;
    }
};
