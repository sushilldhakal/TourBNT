import { useQuery, useMutation } from '@tanstack/react-query';
import {
    categoryApi,
    getUserCategories,
    getPendingCategories,
    getCategoryById,
    updateCategory,
    getAllCategories,
    getAllCategoriesAdmin,
    getChangeRequests,
    approveChangeRequest,
    rejectChangeRequest,
} from '@/lib/api/categories';
import { extractResponseData } from '@/lib/api/apiClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import type { CategoryData } from '@/types/types';

import { queryKeys, categoryKeys } from './queryKeys';
import { useCacheManager } from './cacheUtils';

export { categoryKeys };

const normalizeCategories = (categories: CategoryData[]): CategoryData[] => {
    const normalized = categories.map((cat) => {
        const normalizedId = cat._id || (cat as { id?: string }).id;
        if (!normalizedId) console.warn('[normalizeCategories] Category missing id/_id:', cat);
        return { ...cat, _id: normalizedId } as CategoryData;
    });
    return normalized.filter((c) => c._id);
};

const normalizeCategoryResponse = (response: unknown): CategoryData[] => {
    let categories: CategoryData[] = [];
    if (Array.isArray(response)) categories = response;
    else if (response && typeof response === 'object' && 'data' in response) {
        const d = (response as { data: unknown }).data;
        if (Array.isArray(d)) categories = d;
    } else if (response && typeof response === 'object' && 'success' in response) {
        const s = response as { success: boolean; data?: unknown };
        if (s.success && Array.isArray(s.data)) categories = s.data as CategoryData[];
    }
    const flattened = categories.map((itemRaw) => {
        const item = itemRaw as unknown as Record<string, unknown>;
        const nested = (item.category || item.globalCategory) as Record<string, unknown> | undefined;
        if (nested && typeof nested === 'object') {
            return {
                ...nested,
                _id: item._id || nested._id || item.id || nested.id,
                categoryId: nested._id || nested.id,
                isActive: item.isActive !== undefined ? item.isActive : nested.isActive,
                isFavorite: item.isFavorite !== undefined ? item.isFavorite : nested.isFavorite,
                sortOrder: item.sortOrder,
                addedAt: item.addedAt,
                imageUrl: nested.imageUrl || item.imageUrl,
                name: nested.name || item.name,
                description: nested.description || item.description,
                featuredTours: (nested.featuredTours || item.featuredTours) as unknown,
                approvalStatus: nested.approvalStatus || item.approvalStatus,
                rejectionReason: nested.rejectionReason || item.rejectionReason,
                rejectedAt: nested.rejectedAt || item.rejectedAt,
                rejectedBy: nested.rejectedBy || item.rejectedBy,
            };
        }
        return item;
    });
    return normalizeCategories(flattened as unknown as CategoryData[]);
};

export const useUserCategories = (enabled = true) => {
    return useQuery<CategoryData[]>({
        queryKey: categoryKeys.myCategories(),
        queryFn: async () => {
            const data = await getUserCategories();
            return normalizeCategoryResponse(data);
        },
        enabled,
    });
};

export const useMyCategories = (filters?: { isActive?: boolean; isFavorite?: boolean }) => {
    return useQuery({
        queryKey: [...categoryKeys.myCategories(), filters],
        queryFn: async () => {
            const response = await categoryApi.getMyCategories(filters);
            return extractResponseData(response);
        },
    });
};

export const useMyActiveCategories = () => {
    return useQuery({
        queryKey: categoryKeys.myActive(),
        queryFn: async () => {
            const response = await categoryApi.getMyActive();
            return extractResponseData(response);
        },
    });
};

export const useMyFavoriteCategories = () => {
    return useQuery({
        queryKey: categoryKeys.myFavorites(),
        queryFn: async () => {
            const response = await categoryApi.getMyFavorites();
            return extractResponseData(response);
        },
    });
};

export const useMyCreatedCategories = () => {
    return useQuery({
        queryKey: categoryKeys.myCreated(),
        queryFn: async () => {
            const response = await categoryApi.getMyCreated();
            return extractResponseData(response);
        },
    });
};

export const useApprovedCategories = (params?: {
    page?: number;
    limit?: number;
    search?: string;
}) => {
    return useQuery({
        queryKey: [...categoryKeys.approved(), params],
        queryFn: async () => {
            const response = await categoryApi.getApproved(params);
            return extractResponseData(response);
        },
    });
};

export const useSearchCategories = (
    params: { query?: string; parentCategory?: string },
    enabled = false
) => {
    return useQuery({
        queryKey: categoryKeys.search(JSON.stringify(params)),
        queryFn: async () => {
            const response = await categoryApi.search(params);
            return extractResponseData(response);
        },
        enabled,
    });
};

export const useAdminAllCategories = (filters?: { approvalStatus?: string; parentCategory?: string }) => {
    return useQuery({
        queryKey: [...categoryKeys.adminAll(), filters],
        queryFn: async () => {
            const data = await getAllCategoriesAdmin();
            return normalizeCategoryResponse(data);
        },
    });
};

export const useAdminPendingCategories = () => {
    return useQuery({
        queryKey: categoryKeys.adminPending(),
        queryFn: async () => {
            const data = await getPendingCategories();
            return normalizeCategoryResponse(data);
        },
    });
};

export const useAllCategories = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    return useQuery<CategoryData[]>({
        queryKey: queryKeys.categories.roleBased(),
        queryFn: async () => {
            const data = await getUserCategories();
            return normalizeCategoryResponse(data);
        },
        enabled: isAdmin,
    });
};

export const usePendingCategories = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    return useQuery<CategoryData[]>({
        queryKey: queryKeys.categories.pending(),
        queryFn: async () => {
            const data = await getPendingCategories();
            return normalizeCategoryResponse(data);
        },
        enabled: isAdmin,
    });
};

export const useChangeRequests = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    return useQuery({
        queryKey: categoryKeys.adminChangeRequests(),
        queryFn: async () => {
            const data = await getChangeRequests();
            return data || [];
        },
        enabled: isAdmin,
    });
};

export const useCategoriesRoleBased = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const admin = useAllCategories();
    const user = useUserCategories(!isAdmin);
    return isAdmin ? admin : user;
};

export const useCategoryById = (categoryId: string, enabled = true) => {
    const q = useQuery<CategoryData>({
        queryKey: queryKeys.categories.detail(categoryId),
        queryFn: async () => {
            const raw = await getCategoryById(categoryId) as Record<string, unknown>;
            return { ...raw, _id: raw._id || raw.id || categoryId } as CategoryData;
        },
        enabled: !!categoryId && enabled,
    });
    return { category: q.data, isLoading: q.isLoading, isError: q.isError };
};

/** All categories for select/dropdown (e.g. AddCategory) */
export const useAllCategoriesForSelect = () => {
    return useQuery<CategoryData[]>({
        queryKey: ['all-approved-categories'],
        queryFn: async () => {
            const response = await getAllCategories();
            if (Array.isArray(response)) return normalizeCategories(response as CategoryData[]);
            const d = (response as { data?: unknown })?.data;
            return normalizeCategories(Array.isArray(d) ? (d as CategoryData[]) : []);
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useToggleCategoryActive = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (id: string) => categoryApi.toggleActive(id),
        onSuccess: (res: { data?: { message?: string }; message?: string }) => {
            const msg = res?.data?.message ?? res?.message;
            toast({ title: 'Status Updated', description: msg || 'Category status updated.' });
            cache.invalidateCategories({ my: true, roleBased: true, pending: true });
        },
        onError: (error: { statusCode?: number; message?: string }) => {
            console.error('Toggle category active error:', error);
            let title = 'Failed to Update Status';
            let description = 'An unexpected error occurred.';
            if (error?.statusCode === 404 && error?.message?.includes('not found in your list')) {
                title = 'Category Not in Your List';
                description = 'This category is not in your list. Add it first.';
            } else if (error?.message) description = error.message;
            toast({ title, description, variant: 'destructive' });
        },
    });
};

export const useToggleCategoryFavorite = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (id: string) => categoryApi.toggleFavorite(id),
        onSuccess: () => {
            toast({ title: 'Favorite Updated', description: 'Category favorite status updated.' });
            cache.invalidateCategories({ my: true });
        },
        onError: (error: { message?: string }) => {
            toast({
                title: 'Failed to Update Favorite',
                description: error?.message || 'Could not update favorite.',
                variant: 'destructive',
            });
        },
    });
};

export const useAddCategory = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: ({ id, options }: { id: string; options?: { isFavorite?: boolean; customName?: string } }) =>
            categoryApi.addToMyList(id, options),
        onSuccess: () => {
            cache.invalidateCategories({ my: true });
        },
    });
};

export const useRemoveCategory = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (id: string) => categoryApi.removeFromMyList(id),
        onSuccess: () => {
            cache.invalidateCategories({ my: true });
        },
    });
};

export const useCreateCategory = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (data: FormData) => categoryApi.create(data),
        onSuccess: () => {
            cache.invalidateCategories({ my: true });
        },
    });
};

export const useUpdateCategory = (
    categoryId: string,
    options?: { onSuccess?: () => void; onError?: (e: Error) => void }
) => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const cache = useCacheManager();

    return useMutation({
        mutationFn: (data: FormData) => updateCategory(categoryId, data),
        onSuccess: () => {
            toast({
                title: 'Category updated',
                description: isAdmin ? 'Updated successfully.' : 'Submitted for admin approval.',
            });
            cache.invalidateCategories({
                detailId: categoryId,
                my: true,
                roleBased: true,
                pending: true,
            });
            options?.onSuccess?.();
        },
        onError: (err: Error) => {
            toast({ title: 'Failed to update', description: err?.message || 'Error updating.', variant: 'destructive' });
            options?.onError?.(err);
        },
    });
};

export const useUpdateCategorySettings = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: ({
            id,
            settings,
        }: {
            id: string;
            settings: { isActive?: boolean; isFavorite?: boolean; customName?: string; sortOrder?: number };
        }) => categoryApi.updateSettings(id, settings),
        onSuccess: () => {
            cache.invalidateCategories({ my: true });
        },
    });
};

export const useBulkUpdateCategories = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (updates: Array<{ categoryId: string; sortOrder?: number; isActive?: boolean; isFavorite?: boolean }>) =>
            categoryApi.bulkUpdate(updates),
        onSuccess: () => {
            cache.invalidateCategories({ my: true });
        },
    });
};

export const useAdminApproveCategory = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (id: string) => categoryApi.adminApprove(id),
        onSuccess: () => {
            cache.invalidateCategories({ admin: true, approved: true });
        },
    });
};

export const useAdminRejectCategory = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => categoryApi.adminReject(id, reason),
        onSuccess: () => {
            cache.invalidateCategories({ admin: true });
        },
    });
};

export const useAdminDeleteCategory = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (id: string) => categoryApi.adminDelete(id),
        onSuccess: () => {
            cache.invalidateCategories({ admin: true, approved: true });
        },
    });
};

export const useApproveChangeRequest = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (changeRequestId: string) => approveChangeRequest(changeRequestId),
        onSuccess: () => {
            cache.invalidateCategories({ changeRequests: true, admin: true, approved: true, my: true });
            toast({ title: 'Change request approved', description: 'Category has been updated.' });
        },
    });
};

export const useRejectChangeRequest = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: ({ changeRequestId, reason }: { changeRequestId: string; reason: string }) =>
            rejectChangeRequest(changeRequestId, reason),
        onSuccess: () => {
            cache.invalidateCategories({ changeRequests: true });
            toast({ title: 'Change request rejected', description: 'The change request has been rejected.' });
        },
    });
};
