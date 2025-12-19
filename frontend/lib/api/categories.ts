import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Category API Methods
 * Migrated from dashboard/src/http/categoryApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

export interface CategoryData {
    _id: string;
    name: string;
    description: string;
    imageUrl?: string;
    slug: string;
    isActive: boolean;
    isApproved: boolean;
    approvalStatus: string;
    usageCount: number;
}

/**
 * Get all categories for seller (admin view)
 */
export const getSellerCategories = async () => {
    try {
        const response = await api.get('/api/global/categories/seller/visible');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching seller categories');
    }
};

/**
 * Get user-specific categories
 */
export const getUserCategories = async () => {
    try {
        const response = await api.get('/api/global/categories/user-categories');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user categories');
    }
};

/**
 * Get all approved categories
 */
export const getAllCategories = async () => {
    try {
        const response = await api.get('/api/global/categories/approved');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching categories');
    }
};

/**
 * Get single category by ID
 */
export const getCategory = async (categoryId: string) => {
    try {
        const response = await api.get(`/api/global/categories/${categoryId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching category');
    }
};

/**
 * Get single category by ID (alias for getCategory)
 */
export const getCategoryById = async (categoryId: string) => {
    return getCategory(categoryId);
};

/**
 * Toggle category favorite status
 */
export const toggleCategoryFavorite = async (categoryId: string) => {
    try {
        const response = await api.put(`/api/global/categories/${categoryId}/favorite`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'toggling category favorite');
    }
};

/**
 * Add existing category to seller list
 */
export const addExistingCategoryToSeller = async (categoryId: string) => {
    try {
        const response = await api.post(`/api/global/categories/${categoryId}/add-to-list`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding category to list');
    }
};

/**
 * Remove category from seller list
 */
export const removeExistingCategoryFromSeller = async (categoryId: string) => {
    try {
        const response = await api.post(`/api/global/categories/${categoryId}/remove-from-list`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'removing category from list');
    }
};

/**
 * Toggle category active status
 */
export const toggleCategoryActiveStatus = async (categoryId: string) => {
    try {
        const response = await api.patch(`/api/global/categories/${categoryId}/toggle-active`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'toggling category status');
    }
};

/**
 * Add new category
 */
export const addCategory = async (categoryData: FormData) => {
    try {
        const response = await api.post('/api/global/categories/submit', categoryData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding category');
    }
};

/**
 * Update category
 */
export const updateCategory = async (categoryId: string, categoryData: FormData) => {
    try {
        const response = await api.patch(`/api/global/categories/${categoryId}`, categoryData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating category');
    }
};

/**
 * Delete category (admin only)
 */
export const deleteCategory = async (categoryId: string) => {
    try {
        const response = await api.delete(`/api/global/categories/admin/${categoryId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting category');
    }
};

/**
 * Get pending categories (admin)
 */
export const getPendingCategories = async () => {
    try {
        const response = await api.get('/api/global/categories/admin/pending');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching pending categories');
    }
};

/**
 * Approve category (admin)
 */
export const approveCategory = async (categoryId: string) => {
    try {
        const response = await api.put(`/api/global/categories/admin/${categoryId}/approve`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'approving category');
    }
};

/**
 * Reject category (admin)
 */
export const rejectCategory = async (categoryId: string, reason: string) => {
    try {
        const response = await api.put(`/api/global/categories/admin/${categoryId}/reject`, { reason });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'rejecting category');
    }
};

/**
 * Search categories
 */
export const searchCategories = async (searchParams: {
    query?: string;
    parentCategory?: string;
}) => {
    try {
        const params = new URLSearchParams();
        if (searchParams.query) params.append('query', searchParams.query);
        if (searchParams.parentCategory) params.append('parentCategory', searchParams.parentCategory);

        const response = await api.get(`/api/global/categories/seller/search?${params.toString()}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'searching categories');
    }
};

/**
 * Get enabled categories for tour creation
 */
export const getEnabledCategories = async () => {
    try {
        const response = await api.get('/api/global/categories/user-categories');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching enabled categories');
    }
};

/**
 * Get favorite categories
 */
export const getFavoriteCategories = async () => {
    try {
        const response = await api.get('/api/global/categories/seller/favorites');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching favorite categories');
    }
};
