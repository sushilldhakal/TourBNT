import { api } from './apiClient';
import useUserStore, { User } from '../store/useUserStore';

/**
 * User API Functions
 * All functions work with httpOnly cookies - NO token management
 */

/**
 * Fetch current user from server and update store
 * Server validates httpOnly cookie and returns user info
 * @returns User data or null if not authenticated
 */
export const fetchCurrentUser = async (): Promise<User | null> => {
    try {
        const response = await api.get('/api/users/me');
        const userData = response.data;
        useUserStore.getState().setUser(userData);
        return userData;
    } catch (error) {
        // Not authenticated or session expired
        useUserStore.getState().clearUser();
        return null;
    }
};

/**
 * Login user with credentials
 * Server sets httpOnly cookie on success
 * @param credentials - Email, password, and optional keepMeSignedIn flag
 * @returns User data
 */
export const loginUser = async (credentials: {
    email: string;
    password: string;
    keepMeSignedIn?: boolean;
}): Promise<User> => {
    const response = await api.post('/api/users/login', credentials);
    const userData = response.data.user;
    useUserStore.getState().setUser(userData);
    return userData;
};

/**
 * Logout user
 * Calls server to clear httpOnly cookie and clears local store
 */
export const logoutUser = async (): Promise<void> => {
    try {
        await api.post('/api/users/logout');
    } finally {
        // Always clear user store, even if API call fails
        useUserStore.getState().clearUser();
    }
};
