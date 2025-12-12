import { api } from './apiClient';
import { isAxiosError } from 'axios';

/**
 * Subscriber API endpoints
 */

export const subscribe = async (data: { email: string[] }) => {
    try {
        const response = await api.post('/api/subscribers', data);
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            throw new Error(`Error subscribing: ${error.response?.data.message || error.message}`);
        } else {
            throw new Error(`Error subscribing: ${String(error)}`);
        }
    }
};

export const unsubscribe = async (data: { email: string }) => {
    try {
        const response = await api.post('/api/subscribers/unsubscribe', data);
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            throw new Error(`Error unsubscribing: ${error.response?.data.message || error.message}`);
        } else {
            throw new Error(`Error unsubscribing: ${String(error)}`);
        }
    }
};

export const getAllSubscribers = async () => {
    try {
        const response = await api.get('/api/subscribers');
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            throw new Error(`Error fetching subscribers: ${error.response?.data.message || error.message}`);
        } else {
            throw new Error(`Error fetching subscribers: ${String(error)}`);
        }
    }
};
