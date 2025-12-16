import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getApiTimeout } from '../performanceConfig';
import useUserStore from '@/lib/store/useUserStore';

/**
 * Unified API Client for Next.js Frontend
 * HttpOnly cookie-based authentication - NO token management
 * Browser automatically sends httpOnly cookies with every request
 */

// Base API configuration
export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    timeout: getApiTimeout('default'),
    withCredentials: true, // CRITICAL: Enables httpOnly cookie sending
    decompress: true,
    maxRedirects: 5,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Server-side API client (for SSR and public endpoints)
export const serverApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    timeout: getApiTimeout('default'),
    withCredentials: true,
    decompress: true,
    maxRedirects: 5,
});

// Response interceptor for 401 handling
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle authentication failure (httpOnly cookie expired or invalid)
        if (error.response?.status === 401) {
            console.error('401 Error Details:', {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers,
                data: error.response?.data,
                status: error.response?.status
            });

            // Only redirect if it's a critical auth endpoint, not all 401s
            const criticalEndpoints = ['/api/users/me'];
            const url = error.config?.url || '';

            if (criticalEndpoints.some(endpoint => url.includes(endpoint))) {
                // Clear user store
                useUserStore.getState().clearUser();

                // Redirect to login if on protected route
                if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
                    window.location.href = '/auth/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

// Server API response interceptor (no redirect on server)
serverApi.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

/**
 * API Error class for consistent error handling
 * Follows server error response format from API_DOCUMENTATION.md
 */
export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public data?: any,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Helper function to handle errors consistently
 * Parses server error responses according to API_DOCUMENTATION.md format
 */
export const handleApiError = (error: unknown, context: string): never => {
    if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const serverMessage = error.response?.data?.message || error.message;
        const errorData = error.response?.data;
        const errorCode = error.response?.data?.code;

        throw new ApiError(
            statusCode,
            `${context}: ${serverMessage}`,
            errorData,
            errorCode
        );
    } else if (error instanceof Error) {
        throw new ApiError(500, `${context}: ${error.message}`);
    } else {
        throw new ApiError(500, `${context}: ${String(error)}`);
    }
};

/**
 * Helper to create multipart form data for file uploads
 * Used for gallery uploads and other file operations
 */
export const createFormData = (data: Record<string, any>): FormData => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            return;
        }

        if (value instanceof File || value instanceof Blob) {
            formData.append(key, value);
        } else if (Array.isArray(value)) {
            // Handle file arrays
            if (value.length > 0 && value[0] instanceof File) {
                value.forEach((file) => formData.append(key, file));
            } else {
                formData.append(key, JSON.stringify(value));
            }
        } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, String(value));
        }
    });

    return formData;
};

/**
 * Helper to extract data from server response
 * Server responses follow format: { success: boolean, data: any, message?: string }
 */
export const extractResponseData = <T>(response: any): T => {
    // Handle nested data structure from server
    if (response.data?.data) {
        return response.data.data as T;
    }
    return response.data as T;
};

/**
 * Type-safe API request wrapper
 */
export async function apiRequest<T>(
    config: AxiosRequestConfig,
    useServerApi = false
): Promise<T> {
    try {
        const client = useServerApi ? serverApi : api;
        const response = await client.request(config);
        return extractResponseData<T>(response);
    } catch (error) {
        throw handleApiError(error, config.url || 'API Request');
    }
}
