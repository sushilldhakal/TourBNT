import { api, handleApiError } from './apiClient';

/**
 * Login user
 */
export const login = async (data: { email: string; password: string; keepMeSignedIn: boolean }) => {
    try {
        const response = await api.post('/api/users/login', data, {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'logging in');
    }
};

/**
 * Register new user
 */
export const register = async (data: { name: string; email: string; password: string; phone: string }) => {
    try {
        const response = await api.post('/api/users/register', data, {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'registering');
    }
};

/**
 * Verify email with token
 */
export const verifyEmail = async (data: { token: string }) => {
    try {
        const response = await api.post('/api/auth/verify-email', data, {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'verifying email');
    }
};

/**
 * Request password reset
 */
export const forgotPassword = async (data: { email: string }) => {
    try {
        const response = await api.post('/api/auth/forgot-password', data, {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'requesting password reset');
    }
};

/**
 * Reset password with token
 */
export const resetPassword = async (data: { token: string; password: string }) => {
    try {
        const response = await api.post('/api/auth/reset-password', data, {
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'resetting password');
    }
};
