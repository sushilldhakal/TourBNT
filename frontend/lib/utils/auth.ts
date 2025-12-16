import useUserStore, { User } from '@/lib/store/useUserStore';

/**
 * Authentication utilities for httpOnly cookie-based auth
 * All functions read from the user store - NO JWT decoding, NO cookie access
 * 
 * IMPORTANT: These are synchronous utility functions.
 * For React components, use the useAuth hook instead.
 */

/**
 * Get current user from store
 * @returns User object if authenticated, null otherwise
 */
export const getCurrentUser = (): User | null => {
    const user = useUserStore.getState().user;
    return user.id ? user : null;
};

/**
 * Check if user is authenticated
 * @returns True if user has a valid ID in store
 */
export const isAuthenticated = (): boolean => {
    const user = useUserStore.getState().user;
    return !!user.id;
};

/**
 * Get user ID from store
 * @returns User ID or null
 */
export const getUserId = (): string | null => {
    return useUserStore.getState().user.id;
};

/**
 * Get user role from store
 * @returns User role or null
 */
export const getUserRole = (): string | null => {
    return useUserStore.getState().user.roles;
};

/**
 * Get user email from store
 * @returns User email or null
 */
export const getUserEmail = (): string | null => {
    return useUserStore.getState().user.email;
};

/**
 * Get user name from store
 * @returns User name or undefined
 */
export const getUserName = (): string | undefined => {
    return useUserStore.getState().user.name;
};
