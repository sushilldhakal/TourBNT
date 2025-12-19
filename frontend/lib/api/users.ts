import { api, serverApi, handleApiError, extractResponseData } from './apiClient';
import useUserStore, { User } from '../store/useUserStore';

/**
 * User API Methods
 * Follows the new RESTful API structure with /me routes for current user
 */

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

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

// ============================================================================
// CURRENT USER ROUTES (/me)
// ============================================================================

/**
 * Get current user
 * @returns Current authenticated user data
 */
export const getCurrentUser = async () => {
    try {
        const response = await api.get('/api/users/me');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching current user');
    }
};

/**
 * Update current user profile
 * @param data - FormData with user information (multipart/form-data)
 */
export const updateMyProfile = async (data: FormData) => {
    try {
        const response = await api.patch('/api/users/me', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating profile');
    }
};

/**
 * Change current user password
 * @param data - Current password and new password
 */
export const changeMyPassword = async (data: {
    currentPassword: string;
    newPassword: string;
}) => {
    try {
        const response = await api.patch('/api/users/me/password', data);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'changing password');
    }
};

/**
 * Upload current user avatar
 * @param avatarData - File, FormData, or URL string
 */
export const uploadMyAvatar = async (avatarData: File | FormData | string) => {
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

        const response = await api.post('/api/users/me/avatar', formData, {
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
 * Get current user avatar
 * @returns Avatar URL
 */
export const getMyAvatar = async () => {
    try {
        const response = await api.get('/api/users/me/avatar');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching avatar');
    }
};

/**
 * Get current user settings
 * @returns User settings
 */
export const getMySettings = async () => {
    try {
        const response = await api.get('/api/users/me/settings');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user settings');
    }
};

/**
 * Update current user settings
 * @param data - FormData with settings
 */
export const updateMySettings = async (data: FormData) => {
    try {
        const response = await api.patch('/api/users/me/settings', data, {
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
 * Get decrypted API key for current user
 * @param keyType - Type of API key (openAIKey, CLOUDINARY_API_KEY, etc.)
 */
export const getMyDecryptedApiKey = async (keyType: string) => {
    try {
        const response = await api.get(`/api/users/me/settings/key?keyType=${keyType}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, `fetching API key (${keyType})`);
    }
};

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * Get all users (admin only)
 * @param params - Optional pagination parameters
 */
export const getUsers = async (params?: { page?: number; limit?: number }) => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.page) {
            queryParams.append('page', params.page.toString());
        }
        if (params?.limit) {
            queryParams.append('limit', params.limit.toString());
        }
        
        const url = `/api/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await api.get(url);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching users');
    }
};

/**
 * Get user by ID (admin only)
 * @param userId - User ID
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
 * Update user by ID (owner or admin)
 * @param userId - User ID
 * @param data - FormData with user information (multipart/form-data)
 */
export const updateUser = async (userId: string, data: FormData) => {
    try {
        const response = await api.patch(`/api/users/${userId}`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating user');
    }
};

/**
 * Delete user (owner or admin)
 * @param userId - User ID
 */
export const deleteUser = async (userId: string) => {
    try {
        const response = await api.delete(`/api/users/${userId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting user');
    }
};

/**
 * Change user role (admin only)
 * @param userId - User ID
 * @param role - New role
 */
export const changeUserRole = async (userId: string, role: string) => {
    try {
        const response = await api.patch(`/api/users/${userId}/role`, { role });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'changing user role');
    }
};

// ============================================================================
// SELLER MANAGEMENT (Admin only)
// ============================================================================

/**
 * Get all seller applications (admin only)
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
 * Approve seller application (admin only)
 * @param userId - User ID
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
 * Reject seller application (admin only)
 * @param userId - User ID
 * @param reason - Rejection reason
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
 * Update seller application status (admin only)
 * @param userId - User ID
 * @param status - 'approved' or 'rejected'
 * @param rejectionReason - Required if status is 'rejected'
 */
export const updateSellerStatus = async (
    userId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
) => {
    try {
        const data: { status: string; rejectionReason?: string } = { status };
        if (rejectionReason) {
            data.rejectionReason = rejectionReason;
        }
        const response = await api.patch(`/api/users/${userId}/seller-status`, data);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating seller status');
    }
};

/**
 * Delete seller application (admin only)
 * @param userId - User ID
 */
export const deleteSellerApplication = async (userId: string) => {
    try {
        const response = await api.delete(`/api/users/${userId}/delete-seller`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting seller application');
    }
};

// ============================================================================
// LEGACY/COMPATIBILITY FUNCTIONS (Deprecated - use /me routes instead)
// ============================================================================

/**
 * @deprecated Use updateMyProfile instead
 * Update user settings (legacy - use updateMySettings instead)
 */
export const userSetting = async (userId: string, data: FormData) => {
    console.warn('userSetting is deprecated. Use updateMySettings instead.');
    return updateMySettings(data);
};

/**
 * @deprecated Use getMySettings instead
 * Get user settings (legacy - use getMySettings instead)
 */
export const getUserSetting = async (userId: string) => {
    console.warn('getUserSetting is deprecated. Use getMySettings instead.');
    return getMySettings();
};

/**
 * @deprecated Use getMyDecryptedApiKey instead
 * Get decrypted API key (legacy - use getMyDecryptedApiKey instead)
 */
export const getDecryptedApiKey = async (userId: string, keyType: string) => {
    console.warn('getDecryptedApiKey is deprecated. Use getMyDecryptedApiKey instead.');
    return getMyDecryptedApiKey(keyType);
};

/**
 * @deprecated Use changeMyPassword instead
 * Change user password (legacy - use changeMyPassword instead)
 */
export const changeUserPassword = async (
    userId: string,
    data: { currentPassword: string; newPassword: string }
) => {
    console.warn('changeUserPassword is deprecated. Use changeMyPassword instead.');
    return changeMyPassword(data);
};

/**
 * @deprecated Use uploadMyAvatar instead
 * Upload user avatar (legacy - use uploadMyAvatar instead)
 */
export const uploadAvatar = async (userId: string, avatarData: File | FormData | string) => {
    console.warn('uploadAvatar is deprecated. Use uploadMyAvatar instead.');
    return uploadMyAvatar(avatarData);
};

/**
 * @deprecated Use getMyAvatar instead
 * Get user avatar (legacy - use getMyAvatar instead)
 */
export const getUserAvatar = async (userId: string) => {
    console.warn('getUserAvatar is deprecated. Use getMyAvatar instead.');
    return getMyAvatar();
};

// ============================================================================
// SERVER-SIDE FUNCTIONS (for SSR/SSG)
// ============================================================================

/**
 * Get all users (server-side)
 */
export const getUsersServer = async () => {
    try {
        const response = await serverApi.get('/api/users');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching users (server)');
    }
};

/**
 * Get user by ID (server-side)
 */
export const getUserByIdServer = async (userId: string) => {
    try {
        const response = await serverApi.get(`/api/users/${userId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user (server)');
    }
};
