import { api, serverApi, handleApiError } from './apiClient';

/**
 * Fetch approved destinations
 * @returns List of approved destinations
 */
export const getApprovedDestinations = async () => {
    try {
        // Use serverApi on server-side (no auth), api on client-side
        const apiClient = typeof window === 'undefined' ? serverApi : api;

        const response = await apiClient.get('/global/destinations/approved', {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching destinations');
    }
};

/**
 * Fetch approved categories
 * @returns List of approved categories
 */
export const getApprovedCategories = async () => {
    try {
        // Use serverApi on server-side (no auth), api on client-side
        const apiClient = typeof window === 'undefined' ? serverApi : api;

        const response = await apiClient.get('/global/categories/approved', {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching categories');
    }
};
