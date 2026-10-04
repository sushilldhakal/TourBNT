import { api, serverApi, handleApiError, extractResponseData, isRecord } from './apiClient';
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
        const response = await api.get('/users/me');
        const userData = extractResponseData<User>(response);
        
        // Normalize roles: server returns array, frontend expects string
        let normalizedRoles: string = '';
        if (Array.isArray(userData.roles)) {
            normalizedRoles = userData.roles[0] || '';
        } else if (typeof userData.roles === 'string') {
            normalizedRoles = userData.roles;
        }
        
        const normalizedUser: User = {
            ...userData,
            roles: normalizedRoles,
        };
        
        useUserStore.getState().setUser(normalizedUser);
        return normalizedUser;
    } catch {
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
    const response = await api.post('/auth/login', credentials);
    return storeUserFromAuthResponse(response);
};

/** Sign in (or sign up) with a Google ID token; the server verifies it and starts the session like a password login. */
export const loginWithGoogle = async (credential: string, keepMeSignedIn = false): Promise<User> => {
    const response = await api.post('/auth/google', { credential, keepMeSignedIn });
    return storeUserFromAuthResponse(response);
};

/** Sign in (or sign up) with a Facebook access token; the server checks it with Facebook and starts the session. */
export const loginWithFacebook = async (accessToken: string, keepMeSignedIn = false): Promise<User> => {
    const response = await api.post('/auth/facebook', { accessToken, keepMeSignedIn });
    return storeUserFromAuthResponse(response);
};

/**
 * Sign in with a passkey: the server sends a one-time challenge, the device asks for the person's fingerprint, face
 * or screen lock and signs it, and the server checks the signature. Throws an Error with a readable message.
 */
export const loginWithPasskey = async (keepMeSignedIn = false): Promise<User> => {
    const { startAuthentication } = await import('@simplewebauthn/browser');
    const options = (await api.post('/auth/passkeys/login/options')).data.data;
    const response = await startAuthentication({ optionsJSON: options });
    return storeUserFromAuthResponse(await api.post('/auth/passkeys/login/verify', { response, keepMeSignedIn }));
};

/** Reads the user out of a login response, puts them in the store, and returns them. */
function storeUserFromAuthResponse(response: { data?: unknown }): User {
    const body = response?.data;
    let userData: Record<string, unknown> | null = null;
    if (isRecord(body)) {
        if (isRecord(body.data)) {
            userData = isRecord(body.data.user) ? body.data.user : body.data;
        } else if (isRecord(body.user)) {
            userData = body.user;
        } else if (body.id || body.email) {
            userData = body;
        }
    }

    if (!userData) {
        throw new Error('Invalid login response: no user data');
    }

    const roles = userData.roles;
    const normalizedRoles: string = Array.isArray(roles) ? String(roles[0] ?? '') : String(roles ?? '');

    const normalizedUser = {
        ...userData,
        id: userData.id != null ? String(userData.id) : null,
        roles: normalizedRoles,
    } as User;

    // Update store immediately
    useUserStore.getState().setUser(normalizedUser);
    
    // IMPORTANT: Return the normalized user so handleLogin can verify it
    return normalizedUser;
}

/**
 * Logout user
 * Calls server to clear httpOnly cookie and clears local store
 */
export const logoutUser = async (): Promise<void> => {
    try {
        await api.post('/users/logout');
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
        const response = await api.get('/users/me');
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
        const response = await api.patch('/users/me', data, {
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
        const response = await api.patch('/users/me/password', data);
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

        const response = await api.post('/users/me/avatar', formData, {
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
        const response = await api.get('/users/me/avatar');
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
        const response = await api.get('/users/me/settings');
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
        const response = await api.patch('/users/me/settings', data, {
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
 * @param keyType - Type of API key (openai_api_key, google_api_key)
 */
export const getMyDecryptedApiKey = async (keyType: string) => {
    try {
        const response = await api.get(`/users/me/settings/key?keyType=${keyType}`);
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
        
        const url = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
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
        const response = await api.get(`/users/${userId}`);
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
        const response = await api.patch(`/users/${userId}`, data, {
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
        const response = await api.delete(`/users/${userId}`);
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
        const response = await api.patch(`/users/${userId}/role`, { role });
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
        const response = await api.get('/users/seller-applications');
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
        const response = await api.patch(`/users/${userId}/approve-seller`);
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
        const response = await api.patch(`/users/${userId}/reject-seller`, { reason });
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
        const response = await api.patch(`/users/${userId}/seller-status`, data);
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
        const response = await api.delete(`/users/${userId}/delete-seller`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting seller application');
    }
};

// ============================================================================
// SERVER-SIDE FUNCTIONS (for SSR/SSG)
// ============================================================================

/**
 * Get all users (server-side)
 */
export const getUsersServer = async () => {
    try {
        const response = await serverApi.get('/users');
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
        const response = await serverApi.get(`/users/${userId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user (server)');
    }
};

export interface DirectoryPerson { id: string; name: string; email?: string; avatar?: string | null; role: string }
export interface DirectoryGroup { key: string; label: string; total: number; items: DirectoryPerson[] }

/** Admin: grouped, lightweight people list for the "New chat" picker (a few per account type + totals), one request. */
export const getUserDirectory = async (q = '', limit = 15): Promise<DirectoryGroup[]> => {
    try {
        const response = await api.get('/users/directory', { params: { ...(q ? { q } : {}), limit } });
        return (response.data?.data?.groups ?? []) as DirectoryGroup[];
    } catch (error) {
        throw handleApiError(error, 'fetching people');
    }
};
