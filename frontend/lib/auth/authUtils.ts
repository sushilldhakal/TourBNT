import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';

/**
 * Authentication Utilities
 * Migrated and enhanced from dashboard/src/util/authUtils.ts
 * Handles token management, validation, and user information extraction
 */

// Types
export interface DecodedToken {
    sub: string;
    userId?: string;
    email?: string;
    roles?: string;
    role?: string;
    iat: number;
    exp: number;
}

/**
 * Get access token from cookies
 * Prioritizes cookie storage for Next.js compatibility
 */
export const getAccessToken = (): string | null => {
    // Get from cookie (primary method for Next.js)
    if (typeof window !== 'undefined') {
        const cookieToken = Cookies.get('token');
        if (cookieToken) {
            return cookieToken;
        }

        // Fallback to localStorage for backward compatibility
        try {
            const raw = localStorage.getItem('token-store');
            if (raw) {
                const parsed = JSON.parse(raw);
                return parsed.state?.token || null;
            }
        } catch {
            return null;
        }
    }

    return null;
};

/**
 * Get refresh token from cookies
 */
export const getRefreshToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return Cookies.get('refreshToken') || null;
    }
    return null;
};

/**
 * Validate JWT token
 * Checks if token exists and is not expired
 */
export const isValidToken = (token: string | null): boolean => {
    if (!token) return false;

    try {
        const decoded = jwtDecode<DecodedToken>(token);
        // Check if token is expired (with 30 second buffer)
        return decoded.exp * 1000 > Date.now() + 30000;
    } catch {
        return false;
    }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    const token = getAccessToken();
    return isValidToken(token);
};

/**
 * Get user ID from token
 */
export const getUserId = (): string | null => {
    const accessToken = getAccessToken();
    if (!isValidToken(accessToken)) return null;

    try {
        const decoded = jwtDecode<DecodedToken>(accessToken!);
        return decoded.sub || decoded.userId || null;
    } catch (e) {
        console.error('Failed to decode token:', e);
        return null;
    }
};

/**
 * Get user email from token
 */
export const getUserEmail = (): string | null => {
    const accessToken = getAccessToken();
    if (!isValidToken(accessToken)) return null;

    try {
        const decoded = jwtDecode<DecodedToken>(accessToken!);
        return decoded.email || null;
    } catch {
        return null;
    }
};

/**
 * Get user role from token
 */
export const getUserRole = (): string | null => {
    const accessToken = getAccessToken();
    if (!isValidToken(accessToken)) return null;

    try {
        const decoded = jwtDecode<DecodedToken>(accessToken!);
        return decoded.role || decoded.roles || null;
    } catch {
        return null;
    }
};

/**
 * Get all user roles (if multiple)
 */
export const getUserRoles = (): string[] => {
    const role = getUserRole();
    if (!role) return [];

    // Handle comma-separated roles
    if (role.includes(',')) {
        return role.split(',').map(r => r.trim());
    }

    return [role];
};

/**
 * Check if user has a specific role
 */
export const hasRole = (requiredRole: string): boolean => {
    const roles = getUserRoles();
    return roles.includes(requiredRole);
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (requiredRoles: string[]): boolean => {
    const roles = getUserRoles();
    return requiredRoles.some(role => roles.includes(role));
};

/**
 * Check if user is admin
 */
export const isAdmin = (): boolean => {
    return hasRole('admin');
};

/**
 * Check if user is seller
 */
export const isSeller = (): boolean => {
    return hasRole('seller') || hasRole('admin');
};

/**
 * Check if user is guide
 */
export const isGuide = (): boolean => {
    return hasRole('guide') || hasRole('admin');
};

/**
 * Check if user is agency owner
 */
export const isAgency = (): boolean => {
    return hasRole('agency') || hasRole('admin');
};

/**
 * Check if user is transport owner
 */
export const isTransport = (): boolean => {
    return hasRole('transport') || hasRole('admin');
};

/**
 * Check if user is hotel owner
 */
export const isHotel = (): boolean => {
    return hasRole('hotel') || hasRole('admin');
};

/**
 * Check if user has dashboard access
 * Allows: admin, seller, guide, agency, transport, hotel
 */
export const hasDashboardAccess = (): boolean => {
    return hasAnyRole(['admin', 'seller', 'guide', 'agency', 'transport', 'hotel']);
};

/**
 * Set authentication tokens
 */
export const setAuthTokens = (token: string, refreshToken?: string): void => {
    if (typeof window !== 'undefined') {
        // Set in cookies (primary storage)
        Cookies.set('token', token, {
            expires: 7, // 7 days
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });

        if (refreshToken) {
            Cookies.set('refreshToken', refreshToken, {
                expires: 30, // 30 days
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            });
        }

        // Also set in localStorage for backward compatibility
        try {
            const tokenStore = {
                state: { token },
                version: 0,
            };
            localStorage.setItem('token-store', JSON.stringify(tokenStore));
        } catch (e) {
            console.error('Failed to set token in localStorage:', e);
        }
    }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
    if (typeof window !== 'undefined') {
        // Clear cookies
        Cookies.remove('token');
        Cookies.remove('refreshToken');

        // Clear localStorage
        try {
            localStorage.removeItem('token-store');
            localStorage.removeItem('user');
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
        }
    }
};

/**
 * Get decoded token data
 */
export const getDecodedToken = (): DecodedToken | null => {
    const token = getAccessToken();
    if (!isValidToken(token)) return null;

    try {
        return jwtDecode<DecodedToken>(token!);
    } catch {
        return null;
    }
};

/**
 * Check if token is about to expire (within 5 minutes)
 */
export const isTokenExpiringSoon = (): boolean => {
    const token = getAccessToken();
    if (!token) return false;

    try {
        const decoded = jwtDecode<DecodedToken>(token);
        const expiresIn = decoded.exp * 1000 - Date.now();
        return expiresIn < 5 * 60 * 1000; // Less than 5 minutes
    } catch {
        return false;
    }
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (): Date | null => {
    const token = getAccessToken();
    if (!token) return null;

    try {
        const decoded = jwtDecode<DecodedToken>(token);
        return new Date(decoded.exp * 1000);
    } catch {
        return null;
    }
};
