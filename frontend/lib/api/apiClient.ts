import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getApiTimeout } from '../performanceConfig';
import useUserStore from '@/lib/store/useUserStore';
import { useAuthRedirectStore } from '@/lib/store/useAuthRedirectStore';
import { devLog } from '@/lib/devLogger';
import { SERVER_BACKEND_URL } from '@/lib/config/backendUrl';
import { needsHumanCheck, turnstile } from '@/lib/turnstile';

// Flag to prevent multiple simultaneous redirects
let isRedirecting = false;

/**
 * Handle redirect to login page (SPA-friendly, no page reload)
 * Uses Zustand store to trigger AuthRedirect component which uses Next.js router
 */
export const redirectToLogin = (currentPath: string) => {
    if (typeof window === 'undefined' || isRedirecting) return;
    
    isRedirecting = true;
    
    // Clear user first
    useUserStore.getState().clearUser();
    
    // Set redirect state (AuthRedirect component will handle SPA navigation)
    useAuthRedirectStore.getState().setRedirectToLogin(currentPath);
    
    // Reset flag after a short delay
    setTimeout(() => { isRedirecting = false; }, 500);
};





/**
 * Unified API Client for Next.js Frontend
 * HttpOnly cookie-based authentication - NO token management
 * Browser automatically sends httpOnly cookies with every request
 */

const DIRECT_BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000') + '/api/v1';

/**
 * Auth cookies are host-only. `npm run dev:lan` points the API at the machine's
 * LAN IP while the page is opened on localhost, so a direct login stores `token`
 * on the LAN host and the dashboard guard (which only sees localhost cookies)
 * bounces back to /auth/login. When the page host and API host differ, call the
 * same-origin Next proxy so Set-Cookie lands on the page host.
 */
function browserApiBaseUrl(): string {
    // On the Next server (server components, generateMetadata) call the API over localhost.
    if (typeof window === 'undefined') return `${SERVER_BACKEND_URL}/api/v1`;
    try {
        const backendHost = new URL(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').hostname;
        if (window.location.hostname !== backendHost) return '/api/v1';
    } catch {
        return '/api/v1';
    }
    return DIRECT_BACKEND;
}

export const api = axios.create({
    baseURL: browserApiBaseUrl(),
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
    baseURL: typeof window === 'undefined' ? `${SERVER_BACKEND_URL}/api/v1` : DIRECT_BACKEND,
    timeout: getApiTimeout('default'),
    withCredentials: true,
    decompress: true,
    maxRedirects: 5,
});

api.interceptors.request.use((config) => {
    // Attach the Cloudflare Turnstile token to the few requests the server protects (see lib/turnstile.ts).
    if (needsHumanCheck(config.method, config.url)) {
        const token = turnstile.get();
        if (token) config.headers.set('X-Turnstile-Token', token);
    }
    return config;
}, (e) => Promise.reject(e));

api.interceptors.response.use(
    (response) => {
        // A Turnstile token is single-use: get a fresh one after every protected request.
        if (needsHumanCheck(response.config.method, response.config.url)) turnstile.reset();
        return response;
    },
    (error: AxiosError) => {
        if (needsHumanCheck(error.config?.method, error.config?.url)) turnstile.reset();
        const originalRequest = error.config;
        const status = error.response?.status;
        const url = originalRequest?.url ?? '';

        if (status === 401 && originalRequest) {
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            const isAuthEndpoint = /\/auth\/(login|register)|\/users\/logout/.test(url);
            const isBootstrapEndpoint = url.includes('/users/me');
            const isOnProtectedRoute = currentPath.startsWith('/dashboard');

            if (isAuthEndpoint) return Promise.reject(error);

            if (isBootstrapEndpoint) {
                devLog('auth', `GET /users/me → 401 (cookie not sent or invalid). path=${currentPath}`);
                return Promise.reject(error);
            }

            if (isOnProtectedRoute && !isRedirecting) {
                devLog('auth', `401 on protected route → redirect login. url=${url} path=${currentPath}`);
                redirectToLogin(currentPath);
            }
            return Promise.reject(error);
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
        public data?: unknown,
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
export const createFormData = (data: Record<string, unknown>): FormData => {
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
 * Standard list format: { success, data: [...], message, pagination: { page, limit, totalItems, totalPages } }
 * Single resource: { success, data: {...}, message }
 */
export const extractResponseData = <T>(response: { data?: unknown }): T => {
    const body = response.data;
    if (isRecord(body)) {
        // Handle paginated/list response: { success, data: [...], pagination: {...}, message }
        if (body.pagination != null) return body as T;
        // Handle nested single-resource: { success, message, data: {...} }
        if (body.data !== undefined && !Array.isArray(body.data)) return body.data as T;
    }
    // Handle direct data response
    return body as T;
};

/**
 * For endpoints that return a plain list as `{ success, data: [...] }`.
 * extractResponseData hands back the whole wrapper for those (it only unwraps
 * non-array `data`), so list callers should use this to get the array itself.
 */
export const extractList = <T>(response: { data?: unknown } | null | undefined): T[] => {
    const body = response?.data;
    if (Array.isArray(body)) return body as T[];
    if (isRecord(body)) {
        if (Array.isArray(body.data)) return body.data as T[];
        if (Array.isArray(body.items)) return body.items as T[];
    }
    return [];
};

/** The list in a response body: the body itself if it is an array, else the first array under `keys`. */
export function listFrom<T>(body: unknown, ...keys: string[]): T[] {
    if (Array.isArray(body)) return body as T[];
    if (isRecord(body)) {
        for (const key of keys.length ? keys : ['items', 'data']) {
            const value = body[key];
            if (Array.isArray(value)) return value as T[];
        }
    }
    return [];
}

/** A plain object (not null, not an array). */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The message to show for a failed request: the server's error message when it sent one
 * (`{ error: { message } }` or `{ message }`), else the error's own message, else the fallback.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const body: unknown = error.response?.data;
        if (isRecord(body)) {
            if (isRecord(body.error) && typeof body.error.message === 'string') return body.error.message;
            if (typeof body.message === 'string') return body.message;
        }
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

/** The HTTP status of a failed request, if it got a response. */
export function apiErrorStatus(error: unknown): number | undefined {
    if (axios.isAxiosError(error)) return error.response?.status;
    if (error instanceof ApiError) return error.statusCode;
    return undefined;
}

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