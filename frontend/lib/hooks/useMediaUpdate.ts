/**
 * useMediaUpdate Hook
 * 
 * React Query mutation hook for updating media metadata.
 * Handles title, description, and tags updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMedia } from '@/lib/api/mediaApi';
import { toast } from '@/components/ui/use-toast';
import type { UpdateMediaParams } from '@/components/dashboard/gallery/types';

/**
 * Hook options
 */
interface UseMediaUpdateOptions {
    /**
     * Callback fired on successful update
     */
    onSuccess?: () => void;

    /**
     * Callback fired on update error
     */
    onError?: (error: Error) => void;

    /**
     * Whether to show toast notifications
     * @default true
     */
    showToast?: boolean;
}

/**
 * Custom hook for updating media metadata
 * 
 * Provides mutation function with automatic error handling and cache invalidation.
 * 
 * @param options - Update options including callbacks and UI preferences
 * @returns Mutation object with update function and loading states
 * 
 * @example
 * ```tsx
 * const updateMutation = useMediaUpdate({
 *   onSuccess: () => console.log('Updated successfully'),
 * });
 * 
 * const handleUpdate = () => {
 *   updateMutation.mutate({
 *     imageId: 'img123',
 *     mediaType: 'images',
 *     title: 'New Title',
 *     description: 'New Description',
 *     tags: ['tag1', 'tag2'],
 *   });
 * };
 * ```
 */
export function useMediaUpdate(options: UseMediaUpdateOptions = {}) {
    const {
        onSuccess,
        onError,
        showToast = true,
    } = options;

    const queryClient = useQueryClient();

    return useMutation<void, Error, UpdateMediaParams>({
        mutationFn: async (params: UpdateMediaParams) => {
            return updateMedia(params);
        },
        onSuccess: () => {
            // Invalidate all media queries to refetch with updated data
            queryClient.invalidateQueries({
                queryKey: ['media'],
                refetchType: 'active'
            });

            // Show success toast
            if (showToast) {
                toast({
                    title: 'Update Successful',
                    description: 'Media metadata has been updated',
                });
            }

            // Call custom success handler
            if (onSuccess) {
                onSuccess();
            }
        },
        onError: (error) => {
            // Determine error title based on error message
            let errorTitle = 'Update Failed';

            if (error.message.includes('Authentication')) {
                errorTitle = 'Authentication Required';
            } else if (error.message.includes('not found')) {
                errorTitle = 'Media Not Found';
            } else if (error.message.includes('permission')) {
                errorTitle = 'Permission Denied';
            } else if (error.message.includes('Network')) {
                errorTitle = 'Network Error';
            }

            // Show error toast with appropriate title
            if (showToast) {
                toast({
                    variant: 'destructive',
                    title: errorTitle,
                    description: error.message || 'Failed to update media',
                });
            }

            // Call custom error handler
            if (onError) {
                onError(error);
            }
        },
    });
}
