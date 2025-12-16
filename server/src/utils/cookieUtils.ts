import { CookieOptions } from 'express';

/**
 * Cookie utility functions for consistent httpOnly cookie configuration
 * Handles both development and production environments properly
 */

/**
 * Get standard cookie options for authentication tokens
 * @param maxAge - Cookie max age in milliseconds
 * @returns Cookie options object
 */
export const getAuthCookieOptions = (maxAge?: number): CookieOptions => {
    const options: CookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };

    // Add maxAge if provided
    if (maxAge) {
        options.maxAge = maxAge;
    }

    // Don't set domain - let browser handle it automatically
    // This works better for cross-port scenarios in development

    return options;
};

/**
 * Get cookie options for clearing cookies (logout)
 * Must match the options used when setting the cookie
 * @returns Cookie options object for clearing
 */
export const getClearCookieOptions = (): CookieOptions => {
    const options: CookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };

    // Don't set domain - let browser handle it automatically
    // This works better for cross-port scenarios in development

    return options;
};

/**
 * Cookie configuration constants
 */
export const COOKIE_NAMES = {
    AUTH_TOKEN: 'token',
    REFRESH_TOKEN: 'refreshToken',
} as const;

/**
 * Cookie duration constants (in milliseconds)
 */
export const COOKIE_DURATIONS = {
    SHORT_SESSION: 2 * 60 * 60 * 1000, // 2 hours
    LONG_SESSION: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;