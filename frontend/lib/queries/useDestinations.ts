import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    destinationApi,
    getUserDestinations,
    getPendingDestinations,
    getDestinationById,
    getUserToursTitle,
    updateDestination,
    getAllDestinations,
    getAllDestinationsAdmin,
    getChangeRequests,
    approveChangeRequest,
    rejectChangeRequest,
} from '@/lib/api/destinations';
import { extractResponseData } from '@/lib/api/apiClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import type { DestinationTypes, TourTitle } from '@/types/types';

import type { CreateDestinationDTO } from '@/types/destination';
export type { UserDestination, GlobalDestination, CreateDestinationDTO } from '@/types/destination';

import { queryKeys, destinationKeys } from './queryKeys';
import { useCacheManager } from './cacheUtils';
import { approvedDestinationsOptions } from './publicQueryOptions';

export { destinationKeys };

const normalizeDestinations = (destinations: DestinationTypes[]): DestinationTypes[] => {
    const normalized = destinations.map((dest) => {
        const normalizedId = dest._id || (dest as { id?: string }).id;
        if (!normalizedId) console.warn('[normalizeDestinations] Destination missing id/_id:', dest);
        return { ...dest, _id: normalizedId } as DestinationTypes;
    });
    return normalized.filter((d) => d._id);
};

const normalizeDestinationResponse = (response: unknown): DestinationTypes[] => {
    let destinations: DestinationTypes[] = [];
    if (Array.isArray(response)) destinations = response;
    else if (response && typeof response === 'object' && 'data' in response) {
        const d = (response as { data: unknown }).data;
        if (Array.isArray(d)) destinations = d;
    } else if (response && typeof response === 'object' && 'success' in response) {
        const s = response as { success: boolean; data?: unknown };
        if (s.success && Array.isArray(s.data)) destinations = s.data as DestinationTypes[];
    }
    const flattened = destinations.map((itemRaw) => {
        const item = itemRaw as unknown as Record<string, unknown>;
        const nested = (item.destination || item.globalDestination) as Record<string, unknown> | undefined;
        if (nested && typeof nested === 'object') {
            return {
                ...nested,
                _id: item._id || nested._id || item.id || nested.id,
                destinationId: nested._id || nested.id,
                isActive: item.isActive !== undefined ? item.isActive : nested.isActive,
                isFavorite: item.isFavorite !== undefined ? item.isFavorite : nested.isFavorite,
                sortOrder: item.sortOrder,
                addedAt: item.addedAt,
                coverImage: nested.coverImage || item.coverImage,
                city: nested.city || item.city,
                region: nested.region || item.region,
                country: nested.country || item.country,
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
    return normalizeDestinations(flattened as unknown as DestinationTypes[]);
};

export const useUserDestinations = () => {
    return useQuery<DestinationTypes[]>({
        queryKey: destinationKeys.myDestinations(),
        queryFn: async () => {
            const data = await getUserDestinations();
            return normalizeDestinationResponse(data);
        },
    });
};

export const useMyDestinations = (filters?: { isActive?: boolean; isFavorite?: boolean }) => {
    return useQuery({
        queryKey: [...destinationKeys.myDestinations(), filters],
        queryFn: async () => {
            const response = await destinationApi.getMyDestinations(filters);
            return extractResponseData(response);
        },
    });
};

export const useMyActiveDestinations = () => {
    return useQuery({
        queryKey: destinationKeys.myActive(),
        queryFn: async () => {
            // /seller/enabled returns { ...sellerDestinationPreferences row, destination: {...} } —
            // normalizeDestinationResponse flattens the nested `destination`.
            const response = await destinationApi.getMyActive();
            return normalizeDestinationResponse(extractResponseData(response));
        },
    });
};

export const useMyFavoriteDestinations = () => {
    return useQuery({
        queryKey: destinationKeys.myFavorites(),
        queryFn: async () => {
            const response = await destinationApi.getMyFavorites();
            return extractResponseData(response);
        },
    });
};

export const useMyCreatedDestinations = () => {
    return useQuery({
        queryKey: destinationKeys.myCreated(),
        queryFn: async () => {
            const response = await destinationApi.getMyCreated();
            return extractResponseData(response);
        },
    });
};

export const useApprovedDestinations = (params?: {
    page?: number;
    limit?: number;
    country?: string;
    region?: string;
    search?: string;
}) => {
    return useQuery(approvedDestinationsOptions(params));
};

/** All destinations for select/dropdown (e.g. AddDestination) */
export const useAllDestinationsForSelect = () => {
    return useQuery<DestinationTypes[]>({
        queryKey: ['all-approved-destinations'],
        queryFn: async () => {
            const response = await getAllDestinations();
            if (Array.isArray(response)) return normalizeDestinations(response as DestinationTypes[]);
            const d = (response as { data?: unknown })?.data;
            return normalizeDestinations(Array.isArray(d) ? (d as DestinationTypes[]) : []);
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useSearchDestinations = (
    params: { query?: string; country?: string; region?: string; city?: string },
    enabled = false
) => {
    return useQuery({
        queryKey: destinationKeys.search(JSON.stringify(params)),
        queryFn: async () => {
            const response = await destinationApi.search(params);
            return extractResponseData(response);
        },
        enabled,
    });
};

export const useAdminAllDestinations = (filters?: { approvalStatus?: string; country?: string }) => {
    return useQuery({
        queryKey: [...destinationKeys.adminAll(), filters],
        queryFn: async () => {
            const data = await getAllDestinationsAdmin();
            return normalizeDestinationResponse(data);
        },
    });
};

export const useAdminPendingDestinations = () => {
    return useQuery({
        queryKey: destinationKeys.adminPending(),
        queryFn: async () => {
            const data = await getPendingDestinations();
            return normalizeDestinationResponse(data);
        },
    });
};

export const useAllDestinations = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    return useQuery<DestinationTypes[]>({
        queryKey: queryKeys.destinations.roleBased(),
        queryFn: async () => {
            // Admins see every destination, not just ones on their own seller profile.
            const data = await getAllDestinationsAdmin();
            return normalizeDestinationResponse(data);
        },
        enabled: isAdmin,
    });
};

export const usePendingDestinations = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    return useQuery<DestinationTypes[]>({
        queryKey: queryKeys.destinations.pending(),
        queryFn: async () => {
            const data = await getPendingDestinations();
            return normalizeDestinationResponse(data);
        },
        enabled: isAdmin,
    });
};

export const useChangeRequests = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    return useQuery({
        queryKey: destinationKeys.adminChangeRequests(),
        queryFn: async () => {
            const data = await getChangeRequests();
            return data || [];
        },
        enabled: isAdmin,
    });
};

export const useDestinationsRoleBased = () => {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const admin = useAllDestinations();
    const user = useUserDestinations();
    return isAdmin ? admin : user;
};

export const useDestinationById = (destinationId: string) => {
    const q = useQuery<DestinationTypes>({
        queryKey: ['destination', destinationId],
        queryFn: async () => {
            const raw = await getDestinationById(destinationId) as Record<string, unknown>;
            return { ...raw, _id: raw._id || raw.id || destinationId } as DestinationTypes;
        },
        enabled: !!destinationId,
    });
    return { destination: q.data, isLoading: q.isLoading, isError: q.isError };
};

export const useTourTitles = (userId: string | undefined) => {
    return useQuery<TourTitle[]>({
        queryKey: queryKeys.destinations.tourTitles(userId),
        queryFn: async () => {
            if (!userId) throw new Error('User ID required');
            const r = (await getUserToursTitle(userId)) as TourTitle[] | { data?: TourTitle[] };
            if (Array.isArray(r)) return r;
            const d = r?.data;
            return Array.isArray(d) ? d : [];
        },
        enabled: !!userId,
    });
};

export const useToggleDestinationActive = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (id: string) => destinationApi.toggleActive(id),
        onSuccess: (res: { data?: { message?: string }; message?: string }) => {
            const msg = res?.data?.message ?? res?.message;
            toast({ title: 'Status Updated', description: msg || 'Destination status updated.' });
            cache.invalidateDestinations({ my: true, roleBased: true, pending: true });
        },
        onError: (error: { statusCode?: number; message?: string }) => {
            console.error('Toggle destination active error:', error);
            let title = 'Failed to Update Status';
            let description = 'An unexpected error occurred.';
            if (error?.statusCode === 404 && error?.message?.includes('not found in your list')) {
                title = 'Destination Not in Your List';
                description = 'This destination is not in your list. Add it first.';
            } else if (error?.message) description = error.message;
            toast({ title, description, variant: 'destructive' });
        },
    });
};

export const useToggleDestinationFavorite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => destinationApi.toggleFavorite(id),
        onSuccess: () => {
            toast({ title: 'Favorite Updated', description: 'Destination favorite status updated.' });
            queryClient.invalidateQueries({ queryKey: destinationKeys.myDestinations() });
            queryClient.invalidateQueries({ queryKey: destinationKeys.myFavorites() });
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

export const useAddDestination = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: ({ id, options }: { id: string; options?: { isFavorite?: boolean; customName?: string } }) =>
            destinationApi.addToMyList(id, options),
        onSuccess: () => {
            cache.invalidateDestinations({ my: true });
        },
    });
};

export const useRemoveDestination = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => destinationApi.removeFromMyList(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: destinationKeys.myDestinations() });
            queryClient.invalidateQueries({ queryKey: destinationKeys.myActive() });
        },
    });
};

export const useCreateDestination = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (data: CreateDestinationDTO) => destinationApi.create(data),
        onSuccess: () => {
            cache.invalidateDestinations({ my: true });
        },
    });
};

export const useUpdateDestination = (
    destinationId: string,
    options?: { onSuccess?: () => void; onError?: (e: Error) => void }
) => {
    const { userRole, userId } = useAuth();
    const isAdmin = userRole === 'admin';
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: FormData) => updateDestination(destinationId, data),
        onSuccess: () => {
            toast({
                title: 'Destination updated',
                description: isAdmin ? 'Updated successfully.' : 'Submitted for admin approval.',
            });
            queryClient.invalidateQueries({ queryKey: ['destination', destinationId] });
            if (userId) queryClient.invalidateQueries({ queryKey: ['tourTitles', userId] });
            queryClient.invalidateQueries({ queryKey: destinationKeys.myDestinations() });
            queryClient.invalidateQueries({ queryKey: ['destinations'] });
            queryClient.invalidateQueries({ queryKey: ['pending-destinations'] });
            options?.onSuccess?.();
        },
        onError: (err: Error) => {
            toast({ title: 'Failed to update', description: err?.message || 'Error updating.', variant: 'destructive' });
            options?.onError?.(err);
        },
    });
};

export const useUpdateDestinationSettings = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: ({
            id,
            settings,
        }: {
            id: string;
            settings: { isActive?: boolean; isFavorite?: boolean; customName?: string; sortOrder?: number };
        }) => destinationApi.updateSettings(id, settings),
        onSuccess: () => {
            cache.invalidateDestinations({ my: true });
        },
    });
};

export const useBulkUpdateDestinations = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (updates: Array<{ destinationId: string; sortOrder?: number; isActive?: boolean; isFavorite?: boolean }>) =>
            destinationApi.bulkUpdate(updates),
        onSuccess: () => {
            cache.invalidateDestinations({ my: true });
        },
    });
};

export const useAdminApproveDestination = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => destinationApi.adminApprove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: destinationKeys.adminPending() });
            queryClient.invalidateQueries({ queryKey: destinationKeys.adminAll() });
            queryClient.invalidateQueries({ queryKey: destinationKeys.approved() });
        },
    });
};

export const useAdminRejectDestination = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => destinationApi.adminReject(id, reason),
        onSuccess: () => {
            cache.invalidateDestinations({ admin: true });
        },
    });
};

export const useAdminDeleteDestination = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => destinationApi.adminDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: destinationKeys.adminAll() });
            queryClient.invalidateQueries({ queryKey: destinationKeys.approved() });
        },
    });
};

export const useApproveChangeRequest = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: (changeRequestId: string) => approveChangeRequest(changeRequestId),
        onSuccess: () => {
            cache.invalidateDestinations({ changeRequests: true, admin: true, approved: true, my: true });
            toast({ title: 'Change request approved', description: 'Destination has been updated.' });
        },
    });
};

export const useRejectChangeRequest = () => {
    const cache = useCacheManager();
    return useMutation({
        mutationFn: ({ changeRequestId, reason }: { changeRequestId: string; reason: string }) =>
            rejectChangeRequest(changeRequestId, reason),
        onSuccess: () => {
            cache.invalidateDestinations({ changeRequests: true });
            toast({ title: 'Change request rejected', description: 'The change request has been rejected.' });
        },
    });
};
