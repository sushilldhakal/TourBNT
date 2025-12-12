import { api, handleApiError } from './apiClient';
import { Category } from '../types';

/**
 * Get all approved categories
 * Used for public-facing category filtering
 * 
 * @returns Array of approved categories
 */
export const getAllCategories = async (): Promise<Category[]> => {
    try {
        const response = await api.get('/api/global/categories/approved');

        // Handle different response formats
        if (response.data.data) {
            return response.data.data;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        return [];
    } catch (error) {
        handleApiError(error, 'fetching categories');
        return [];
    }
};

/**
 * Get a single category by ID
 * 
 * @param categoryId - Category ID
 * @returns Category data
 */
export const getCategoryById = async (categoryId: string) => {
    try {
        const response = await api.get(`/api/global/categories/${categoryId}`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching category details');
    }
};

/**
 * Dashboard Category Management APIs
 * For sellers and admins to manage categories
 */

/**
 * Get all categories (admin view)
 */
export const getSellerCategories = async () => {
    try {
        const response = await api.get('/api/global/categories/seller/visible');
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching seller categories');
        throw error;
    }
};

/**
 * Get user's categories (seller view)
 */
export const getUserCategories = async () => {
    try {
        const response = await api.get('/api/global/categories/user-categories');
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching user categories');
        throw error;
    }
};

/**
 * Get pending categories (admin only)
 */
export const getPendingCategories = async () => {
    try {
        const response = await api.get('/api/global/categories/admin/pending');
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching pending categories');
        throw error;
    }
};

/**
 * Search categories
 */
export const searchCategories = async (params: { query?: string } = {}) => {
    try {
        const response = await api.get('/api/global/categories/seller/search', { params });
        return response.data;
    } catch (error) {
        handleApiError(error, 'searching categories');
        throw error;
    }
};

/**
 * Add new category
 */
export const addCategory = async (formData: FormData) => {
    try {
        const response = await api.post('/api/global/categories/submit', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'adding category');
        throw error;
    }
};

/**
 * Update category
 */
export const updateCategory = async (categoryId: string, formData: FormData) => {
    try {
        const response = await api.patch(`/api/global/categories/${categoryId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'updating category');
        throw error;
    }
};

/**
 * Delete category (admin only)
 */
export const deleteCategory = async (categoryId: string) => {
    try {
        const response = await api.delete(`/api/global/categories/admin/${categoryId}`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'deleting category');
        throw error;
    }
};

/**
 * Add existing category to seller's list
 */
export const addExistingCategoryToSeller = async (categoryId: string) => {
    try {
        const response = await api.post(`/api/global/categories/${categoryId}/add-to-list`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'adding existing category');
        throw error;
    }
};

/**
 * Remove category from seller's list
 */
export const removeExistingCategoryFromSeller = async (categoryId: string) => {
    try {
        const response = await api.post(`/api/global/categories/${categoryId}/remove-from-list`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'removing category');
        throw error;
    }
};

/**
 * Toggle category active status
 */
export const toggleCategoryActiveStatus = async (categoryId: string) => {
    try {
        const response = await api.patch(`/api/global/categories/${categoryId}/toggle-active`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'toggling category status');
        throw error;
    }
};

/**
 * Approve category (admin only)
 */
export const approveCategory = async (categoryId: string) => {
    try {
        const response = await api.put(`/api/global/categories/admin/${categoryId}/approve`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'approving category');
        throw error;
    }
};

/**
 * Reject category (admin only)
 */
export const rejectCategory = async (categoryId: string, reason: string) => {
    try {
        const response = await api.put(`/api/global/categories/admin/${categoryId}/reject`, { reason });
        return response.data;
    } catch (error) {
        handleApiError(error, 'rejecting category');
        throw error;
    }
};
