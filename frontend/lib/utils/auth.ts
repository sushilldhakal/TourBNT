import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

/**
 * Decoded JWT token structure
 */
export interface DecodedToken {
    sub: string;
    roles: string;
    exp: number;
    iat?: number;
}

/**
 * User authentication state
 */
export interface AuthState {
    isAuthenticated: boolean;
    userRole: string | null;
    userId: string | null;
    isExpired: boolean;
}

/**
 * Get and validate token from cookies
 * @returns Decoded token or null if invalid/expired
 */
export const getValidToken = (): DecodedToken | null => {
    const token = Cookies.get('token');

    if (!token) {
        return null;
    }

    try {
        const decoded = jwtDecode<DecodedToken>(token);

        // Check if token is expired
        if (decoded.exp * 1000 <= Date.now()) {
            // Token expired, remove it
            Cookies.remove('token', { path: '/' });
            return null;
        }

        return decoded;
    } catch (error) {
        // Invalid token, remove it
        console.error('Invalid token:', error);
        Cookies.remove('token', { path: '/' });
        return null;
    }
};

/**
 * Get current authentication state
 * @returns Authentication state object
 */
export const getAuthState = (): AuthState => {
    const decoded = getValidToken();

    if (!decoded) {
        return {
            isAuthenticated: false,
            userRole: null,
            userId: null,
            isExpired: false,
        };
    }

    return {
        isAuthenticated: true,
        userRole: decoded.roles,
        userId: decoded.sub,
        isExpired: false,
    };
};

/**
 * Clear authentication (logout)
 */
export const clearAuth = (): void => {
    Cookies.remove('token', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
};

/**
 * Set authentication token
 * @param token - JWT token to store
 */
export const setAuthToken = (token: string): void => {
    Cookies.set('token', token, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
};
