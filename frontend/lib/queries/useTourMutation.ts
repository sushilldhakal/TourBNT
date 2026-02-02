/**
 * useTourMutation Hook
 * Simplified hook for tour CRUD operations with React Query
 * Data processing is handled by TourProvider - this just manages API calls
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createTour, updateTour, deleteTour, getSingleTour } from '@/lib/api/tours';
import { queryKeys } from './queryKeys';
import { useCacheManager } from './cacheUtils';
import { toast } from '@/components/ui/use-toast';

interface UseTourMutationOptions {
    tourId?: string;
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
}

interface UseTourMutationReturn {
    createMutation: any;
    updateMutation: any;
    deleteMutation: any;
    isLoading: boolean;
}

export function useTourQuery(tourId?: string, enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.tours.detail(tourId),
        queryFn: () => getSingleTour(tourId!),
        enabled: !!tourId && enabled,
    });
}

/**
 * Custom hook for tour mutations
 * Provides create, update, and delete operations with proper error handling
 */
export function useTourMutation({
    tourId,
    onSuccess,
    onError,
}: UseTourMutationOptions = {}): UseTourMutationReturn {
    const router = useRouter();
    const cache = useCacheManager();

    const createMutation = useMutation({
        mutationFn: (formData: FormData) => createTour(formData),
        onSuccess: (data: any) => {
            toast({
                title: 'Success!',
                description: 'Tour created successfully',
            });
            cache.invalidateTours();
            if (onSuccess) {
                onSuccess(data);
            } else {
                const createdTourId = data?.tour?._id || data?._id;
                if (createdTourId) {
                    router.push(`/dashboard/tours/edit/${createdTourId}`);
                } else {
                    router.push('/dashboard/tours');
                }
            }
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error creating tour',
                description: error.message || 'Failed to create tour',
            });
            if (onError) onError(error);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (formData: FormData) => {
            if (!tourId) throw new Error('Tour ID is required for update');
            return updateTour(tourId, formData);
        },
        onSuccess: (data: any) => {
            toast({
                title: 'Success!',
                description: 'Tour updated successfully',
            });
            cache.invalidateTours({ detailId: tourId });
            if (onSuccess) onSuccess(data);
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error updating tour',
                description: error.message || 'Failed to update tour',
            });
            if (onError) onError(error);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => {
            if (!tourId) throw new Error('Tour ID is required for delete');
            return deleteTour(tourId);
        },
        onSuccess: (data: any) => {
            toast({
                title: 'Success!',
                description: 'Tour deleted successfully',
            });
            cache.invalidateTours();
            if (onSuccess) onSuccess(data);
            else router.push('/dashboard/tours');
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error deleting tour',
                description: error.message || 'Failed to delete tour',
            });
            if (onError) onError(error);
        },
    });

    return {
        createMutation,
        updateMutation,
        deleteMutation,
        isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    };
}
