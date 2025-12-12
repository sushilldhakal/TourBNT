import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Subscriber API Methods
 * Migrated from dashboard/src/http/subscriberApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

/**
 * Subscribe email(s) to newsletter
 */
export const subscribe = async (data: { email: string[] }) => {
    try {
        const response = await api.post('/api/subscribers', data);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'subscribing');
    }
};

/**
 * Unsubscribe email from newsletter
 */
export const unsubscribe = async (data: { email: string }) => {
    try {
        const response = await api.post('/api/subscribers/unsubscribe', data);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'unsubscribing');
    }
};

/**
 * Get all subscribers (admin only)
 */
export const getAllSubscribers = async () => {
    try {
        const response = await api.get('/api/subscribers');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching subscribers');
    }
};
