import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getApiTimeout } from '../performanceConfig';
import useUserStore from '@/lib/store/useUserStore';

// Flag to prevent multiple simultaneous redirects
let isRedirecting = false;

/**
 * Unified API Client for Next.js Frontend
 * HttpOnly cookie-based authentication - NO token management
 * Browser automatically sends httpOnly cookies with every request
 */

// Base API configuration
export const api = axios.create({
    baseURL: (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000') + '/api/v1',
    timeout: getApiTimeout('default'),
    withCredentials: true, // CRITICAL: Enables httpOnly cookie sending
    decompress: true,
    maxRedirects: 5,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Local API client — targets this Next.js app's own route handlers
 * (frontend/app/api/v1/...) instead of the Express backend.
 * Used for resources where Next.js is the single source of truth
 * (e.g. subscribers, facts, faqs, posts, comments) rather than a proxy to Express.
 *
 * A relative baseURL only resolves in the browser. Server-side callers (SSR,
 * server components) need an absolute URL to reach this same Next.js server.
 */
const localApiBaseURL = typeof window === 'undefined'
    ? (process.env.NEXT_INTERNAL_URL || process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`) + '/api/v1'
    : '/api/v1';

export const localApi = axios.create({
    baseURL: localApiBaseURL,
    timeout: getApiTimeout('default'),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Server-side API client (for SSR and public endpoints)
export const serverApi = axios.create({
    baseURL: (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000') + '/api/v1',
    timeout: getApiTimeout('default'),
    withCredentials: true,
    decompress: true,
    maxRedirects: 5,
});

// Response interceptor for 401 handling
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        // Handle authentication failure (httpOnly cookie expired or invalid)
        if (error.response?.status === 401) {
            const url = error.config?.url || '';
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            const isProtectedRoute = currentPath.startsWith('/dashboard');
            const isAuthEndpoint = url.includes('/users/me') || url.includes('/auth/');
            const isOnLoginPage = currentPath.startsWith('/auth/login');

            // Don't interfere with login/logout endpoints - let them handle their own errors
            const isLoginEndpoint = url.includes('/users/login') || url.includes('/auth/login');
            const isLogoutEndpoint = url.includes('/users/logout') || url.includes('/auth/logout');

            if (isLoginEndpoint || isLogoutEndpoint) {
                // Let login/logout endpoints handle their own errors
                return Promise.reject(error);
            }

            // Handle all 401 errors on protected routes or auth endpoints
            if (isProtectedRoute || isAuthEndpoint) {
                // Check if this is a retry attempt (to avoid infinite loops)
                const isRetry = (error.config as any)?._retry;

                if (!isRetry) {
                    // Mark as retry to prevent infinite loops
                    (error.config as any)._retry = true;

                    // Wait a bit longer to allow token refresh to complete (sliding session)
                    // The backend might be refreshing the token, so give it time
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    try {
                        // Retry the request once (token might have been refreshed)
                        const retryResponse = await api.request(error.config!);
                        console.log('✅ 401 retry succeeded:', url);
                        return retryResponse;
                    } catch (retryError: any) {
                        // If retry also fails, the token is truly expired/invalid
                        console.error('❌ 401 Error after retry:', {
                            url: error.config?.url,
                            method: error.config?.method,
                            status: retryError?.response?.status || error.response?.status,
                            currentPath,
                            isProtectedRoute,
                        });

                        // Only clear user and redirect if we're on a protected route
                        // Don't clear on auth endpoints that might be called from public pages
                        // Don't redirect if already on login page (avoid redirect loops)
                        if (isProtectedRoute && !isRedirecting && !isOnLoginPage) {
                            isRedirecting = true;
                            // Use a small delay to avoid race conditions with other state updates
                            setTimeout(() => {
                                useUserStore.getState().clearUser();
                                if (typeof window !== 'undefined') {
                                    const redirectPath = encodeURIComponent(currentPath);
                                    console.log('🔄 Redirecting to login:', redirectPath);
                                    window.location.href = `/auth/login?redirect=${redirectPath}`;
                                }
                            }, 100);
                        }
                    }
                } else {
                    // Already retried, this is a real 401 - clear user and redirect
                    console.error('❌ 401 Error (already retried):', {
                        url: error.config?.url,
                        method: error.config?.method,
                        currentPath,
                        isProtectedRoute,
                    });

                    if (isProtectedRoute && !isRedirecting && !isOnLoginPage) {
                        isRedirecting = true;
                        // Use a small delay to avoid race conditions
                        setTimeout(() => {
                            useUserStore.getState().clearUser();
                            if (typeof window !== 'undefined') {
                                const redirectPath = encodeURIComponent(currentPath);
                                console.log('🔄 Redirecting to login (retry failed):', redirectPath);
                                window.location.href = `/auth/login?redirect=${redirectPath}`;
                            }
                        }, 100);
                    }
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
 * Converts a FormData instance to a plain object, grouping repeated keys
 * into arrays. Used when a call site still builds a FormData payload (e.g.
 * from a shared form component) but the target endpoint is a Next.js route
 * handler expecting JSON rather than multipart/form-data.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    formData.forEach((value, key) => {
        if (key in obj) {
            const existing = obj[key];
            obj[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
        } else {
            obj[key] = value;
        }
    });
    return obj;
}

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
    if (response.data?.items) {
        return response.data.items as T;
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
