import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Category API
 * All category-related API calls. Single source of truth.
 */

export const categoryApi = {
    getApproved: (params?: { page?: number; limit?: number; search?: string }) =>
        api.get('/global/categories', { params }),
    getByType: (type: string, search?: string) =>
        api.get(`/global/categories/type/${type}`, { params: { search } }),
    search: (params: { query?: string; parentCategory?: string }) =>
        api.get('/global/categories/search', { params }),
    create: (data: FormData) =>
        api.post('/global/categories', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    update: (id: string, data: FormData) =>
        api.patch(`/global/categories/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    getMyCreated: () =>
        api.get('/global/categories/my-created'),
    getMyCategories: (filters?: { isActive?: boolean; isFavorite?: boolean }) =>
        api.get('/global/categories/user-categories', { params: filters }),
    getMyActive: () =>
        api.get('/global/categories/my-active'),
    getMyFavorites: () =>
        api.get('/global/categories/my-favorites'),
    // These three previously called paths/methods that don't exist on the
    // server (POST .../add, DELETE .../remove, PATCH .../toggle-favorite) —
    // aligned to the routes that are actually registered.
    addToMyList: (id: string, options?: { isFavorite?: boolean; customName?: string }) =>
        api.post(`/global/categories/${id}/add-to-list`, options),
    removeFromMyList: (id: string) =>
        api.post(`/global/categories/${id}/remove-from-list`),
    toggleActive: (id: string) =>
        api.patch(`/global/categories/${id}/toggle-active`),
    toggleFavorite: (id: string) =>
        api.put(`/global/categories/${id}/favorite`),
    updateSettings: (id: string, settings: { isActive?: boolean; isFavorite?: boolean; customName?: string; sortOrder?: number }) =>
        api.patch(`/global/categories/${id}/settings`, settings),
    bulkUpdate: (updates: Array<{ categoryId: string; sortOrder?: number; isActive?: boolean; isFavorite?: boolean }>) =>
        api.post('/global/categories/bulk-update', { updates }),
    adminGetAll: (filters?: { approvalStatus?: string; parentCategory?: string }) =>
        api.get('/global/categories/admin/all', { params: filters }),
    adminGetPending: () =>
        api.get('/global/categories/admin/pending'),
    adminApprove: (id: string) =>
        api.put(`/global/categories/admin/${id}/approve`),
    adminReject: (id: string, reason: string) =>
        api.put(`/global/categories/admin/${id}/reject`, { reason }),
    adminDelete: (id: string) =>
        api.delete(`/global/categories/admin/${id}`),
    // Change requests (admin only)
    adminGetChangeRequests: () =>
        api.get('/global/categories/admin/change-requests'),
    adminApproveChangeRequest: (changeRequestId: string) =>
        api.put(`/global/categories/admin/change-requests/${changeRequestId}/approve`),
    adminRejectChangeRequest: (changeRequestId: string, reason: string) =>
        api.put(`/global/categories/admin/change-requests/${changeRequestId}/reject`, { reason }),
};

export const getUserCategories = async () => {
    try {
        const response = await categoryApi.getMyCategories();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user categories');
    }
};

export const getAllCategories = async () => {
    try {
        const response = await categoryApi.getApproved();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching categories');
    }
};

export const getCategory = async (categoryId: string) => {
    try {
        const response = await api.get(`/global/categories/public/${categoryId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching category');
    }
};

export const getCategoryById = async (categoryId: string) => getCategory(categoryId);

export const toggleCategoryFavorite = async (categoryId: string) => {
    try {
        const response = await categoryApi.toggleFavorite(categoryId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'toggling category favorite');
    }
};

export const toggleCategoryActiveStatus = async (categoryId: string) => {
    try {
        const response = await categoryApi.toggleActive(categoryId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'toggling category active');
    }
};

export const addExistingCategoryToSeller = async (categoryId: string) => {
    if (!categoryId || categoryId === 'undefined' || categoryId === 'null' || categoryId.trim() === '') {
        throw new Error('Invalid category ID: categoryId is required and cannot be undefined, null, or empty');
    }
    try {
        const response = await categoryApi.addToMyList(categoryId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding category to list');
    }
};

export const removeExistingCategoryFromSeller = async (categoryId: string) => {
    try {
        const response = await categoryApi.removeFromMyList(categoryId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'removing category from list');
    }
};

export const addCategory = async (categoryData: FormData) => {
    try {
        const response = await categoryApi.create(categoryData);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding category');
    }
};

export const updateCategory = async (categoryId: string, categoryData: FormData) => {
    try {
        const response = await categoryApi.update(categoryId, categoryData);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating category');
    }
};

export const deleteCategory = async (categoryId: string) => {
    try {
        const response = await categoryApi.adminDelete(categoryId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting category');
    }
};

export const getPendingCategories = async () => {
    try {
        const response = await categoryApi.adminGetPending();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching pending categories');
    }
};

export const approveCategory = async (categoryId: string) => {
    try {
        const response = await categoryApi.adminApprove(categoryId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'approving category');
    }
};

export const rejectCategory = async (categoryId: string, reason: string) => {
    try {
        const response = await categoryApi.adminReject(categoryId, reason);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'rejecting category');
    }
};

// Change request functions (admin only)
export const getChangeRequests = async () => {
    try {
        const response = await categoryApi.adminGetChangeRequests();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching change requests');
    }
};

export const approveChangeRequest = async (changeRequestId: string) => {
    try {
        const response = await categoryApi.adminApproveChangeRequest(changeRequestId);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'approving change request');
    }
};

export const rejectChangeRequest = async (changeRequestId: string, reason: string) => {
    try {
        const response = await categoryApi.adminRejectChangeRequest(changeRequestId, reason);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'rejecting change request');
    }
};

export const searchCategories = async (searchParams: { query?: string; parentCategory?: string }) => {
    try {
        const response = await categoryApi.search(searchParams);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'searching categories');
    }
};

export const getMyActiveCategories = async () => {
    try {
        const response = await categoryApi.getMyActive();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching active categories');
    }
};

export const getMyFavoriteCategories = async () => {
    try {
        const response = await categoryApi.getMyFavorites();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching favorite categories');
    }
};

export const getMyCreatedCategories = async () => {
    try {
        const response = await categoryApi.getMyCreated();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching created categories');
    }
};

export const updateCategorySettings = async (
    categoryId: string,
    settings: { customName?: string; isFavorite?: boolean; isActive?: boolean }
) => {
    try {
        const response = await categoryApi.updateSettings(categoryId, settings);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating category settings');
    }
};

export const bulkUpdateCategories = async (
    updates: Array<{ categoryId: string; isActive?: boolean; isFavorite?: boolean; customName?: string }>
) => {
    try {
        const response = await categoryApi.bulkUpdate(updates);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'bulk updating categories');
    }
};

export const getAllCategoriesAdmin = async () => {
    try {
        const response = await categoryApi.adminGetAll();
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching all categories (admin)');
    }
};
