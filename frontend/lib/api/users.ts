import { api, serverApi, handleApiError, extractResponseData } from './apiClient';

/**
 * User API Methods
 * Migrated from dashboard/src/http/userApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

/**
 * Get all users
 */
export const getUsers = async () => {
    try {
        const response = await api.get('/api/users/all');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching users');
    }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string) => {
    try {
        const response = await api.get(`/api/users/${userId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user');
    }
};

/**
 * Get user settings
 */
export const getUserSetting = async (userId: string) => {
    try {
        const response = await api.get(`/api/users/setting/${userId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user settings');
    }
};

/**
 * Update user settings
 */
export const userSetting = async (userId: string, data: FormData) => {
    try {
        const response = await api.patch(`/api/users/setting/${userId}`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating user settings');
    }
};

/**
 * Get decrypted API key
 */
export const getDecryptedApiKey = async (userId: string, keyType: string) => {
    try {
        const response = await api.get(`/api/users/setting/${userId}/key?keyType=${keyType}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, `fetching API key (${keyType})`);
    }
};

/**
 * Change user password
 */
export const changeUserPassword = async (
    userId: string,
    data: { currentPassword: string; newPassword: string }
) => {
    try {
        const response = await api.post(`/api/users/${userId}/change-password`, data);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'changing password');
    }
};

/**
 * Upload user avatar
 */
export const uploadAvatar = async (userId: string, avatarData: File | FormData | string) => {
    try {
        let formData: FormData;

        if (avatarData instanceof File) {
            formData = new FormData();
            formData.append('avatar', avatarData);
        } else if (avatarData instanceof FormData) {
            formData = avatarData;
        } else {
            // If it's a string (URL), create FormData with the URL
            formData = new FormData();
            formData.append('avatarUrl', avatarData);
        }

        const response = await api.post(`/api/users/${userId}/avatar`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'uploading avatar');
    }
};

/**
 * Get user avatar
 */
export const getUserAvatar = async (userId: string) => {
    try {
        const response = await api.get(`/api/users/${userId}/avatar`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching avatar');
    }
};

/**
 * Update user information
 */
export const updateUser = async (
    userId: string,
    data: { name: string; email: string; phone: string }
) => {
    try {
        const response = await api.patch(`/api/users/${userId}`, data);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating user');
    }
};

/**
 * Get seller applications
 */
export const getSellerApplications = async () => {
    try {
        const response = await api.get('/api/users/seller-applications');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching seller applications');
    }
};

/**
 * Approve seller application
 */
export const approveSellerApplication = async (userId: string) => {
    try {
        const response = await api.patch(`/api/users/${userId}/approve-seller`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'approving seller application');
    }
};

/**
 * Reject seller application
 */
export const rejectSellerApplication = async (userId: string, reason: string) => {
    try {
        const response = await api.patch(`/api/users/${userId}/reject-seller`, { reason });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'rejecting seller application');
    }
};

/**
 * Delete seller application
 */
export const deleteSellerApplication = async (userId: string) => {
    try {
        const response = await api.delete(`/api/users/${userId}/delete-seller`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting seller application');
    }
};

/**
 * Server-side user fetching (for SSR/SSG)
 */
export const getUsersServer = async () => {
    try {
        const response = await serverApi.get('/api/users/all');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching users (server)');
    }
};

export const getUserByIdServer = async (userId: string) => {
    try {
        const response = await serverApi.get(`/api/users/${userId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user (server)');
    }
};
