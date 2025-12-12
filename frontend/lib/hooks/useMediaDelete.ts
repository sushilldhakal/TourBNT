/**
 * useMediaDelete Hook
 * 
 * React Query mutation hook for deleting media files.
 * Supports both single and bulk deletion with optimistic updates.
 * 
 * Requirements: 5.2
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMedia } from '@/lib/api/mediaApi';
import { toast } from '@/components/ui/use-toast';
import type { DeleteMediaParams } from '@/components/dashboard/gallery/types';

/**
 * Hook options
 */
interface UseMediaDeleteOptions {
    /**
     * Callback fired on successful deletion
     */
    onSuccess?: () => void;

    /**
     * Callback fired on deletion error
     */
    onError?: (error: Error) => void;

    /**
     * Whether to show toast notifications
     * @default true
     */
    showToast?: boolean;

    /**
     * Whether to show confirmation dialog
     * @default true
     */
    showConfirmation?: boolean;
}

/**
 * Custom hook for deleting media files
 * 
 * Provides mutation function with automatic error handling and cache invalidation.
 * Supports both single and bulk deletion operations.
 * 
 * @param options - Delete options including callbacks and UI preferences
 * @returns Mutation object with delete function and loading states
 * 
 * @example
 * ```tsx
 * const deleteMutation = useMediaDelete({
 *   onSuccess: () => console.log('Deleted successfully'),
 * });
 * 
 * const handleDelete = () => {
 *   deleteMutation.mutate({
 *     userId: 'user123',
 *     mediaIds: ['id1', 'id2'],
 *     mediaType: 'images',
 *   });
 * };
 * ```
 */
export function useMediaDelete(options: UseMediaDeleteOptions = {}) {
    const {
        onSuccess,
        onError,
        showToast = true,
    } = options;

    const queryClient = useQueryClient();

    return useMutation<void, Error, DeleteMediaParams>({
        mutationFn: async (params: DeleteMediaParams) => {
            return deleteMedia(params);
        },
        onSuccess: (_, variables) => {
            // Invalidate all media queries to refetch without deleted items
            // This ensures the gallery removes the deleted files
            queryClient.invalidateQueries({
                queryKey: ['media'],
                // Refetch immediately to reflect deletions
                refetchType: 'active'
            });

            // Show success toast
            if (showToast) {
                const count = Array.isArray(variables.mediaIds)
                    ? variables.mediaIds.length
                    : 1;
                toast({
                    title: 'Deletion Successful',
                    description: `${count} item${count !== 1 ? 's' : ''} deleted successfully`,
                });
            }

            // Call custom success handler
            if (onSuccess) {
                onSuccess();
            }
        },
        onError: (error) => {
            // Determine error title based on error message
            let errorTitle = 'Deletion Failed';

            if (error.message.includes('Authentication') || error.message.includes('session')) {
                errorTitle = 'Authentication Required';
            } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
                errorTitle = 'Media Not Found';
            } else if (error.message.includes('permission') || error.message.includes('administrator')) {
                errorTitle = 'Permission Denied';
            } else if (error.message.includes('Network') || error.message.includes('connection')) {
                errorTitle = 'Network Error';
            } else if (error.message.includes('timeout')) {
                errorTitle = 'Request Timeout';
            } else if (error.message.includes('Server error')) {
                errorTitle = 'Server Error';
            } else if (error.message.includes('cloud storage')) {
                errorTitle = 'Storage Error';
            }

            // Show error toast with appropriate title
            if (showToast) {
                toast({
                    variant: 'destructive',
                    title: errorTitle,
                    description: error.message || 'Failed to delete media',
                });
            }

            // Call custom error handler
            if (onError) {
                onError(error);
            }
        },
    });
}

/**
 * Helper hook for bulk deletion with confirmation
 * 
 * Wraps useMediaDelete with built-in confirmation dialog logic.
 * 
 * @param options - Delete options
 * @returns Object with delete function that shows confirmation
 */
export function useMediaDeleteWithConfirmation(
    options: UseMediaDeleteOptions = {}
) {
    const deleteMutation = useMediaDelete(options);

    const deleteWithConfirmation = async (params: DeleteMediaParams) => {
        const count = Array.isArray(params.mediaIds)
            ? params.mediaIds.length
            : 1;

        const confirmed = window.confirm(
            `Are you sure you want to delete ${count} item${count !== 1 ? 's' : ''}? This action cannot be undone.`
        );

        if (confirmed) {
            deleteMutation.mutate(params);
        }
    };

    return {
        ...deleteMutation,
        deleteWithConfirmation,
    };
}

/**
 * Helper function to prepare delete parameters
 * 
 * @param userId - User ID
 * @param mediaIds - Single ID or array of IDs
 * @param mediaType - Media type (images, videos, pdfs)
 * @returns Formatted delete parameters
 */
export function prepareDeleteParams(
    userId: string,
    mediaIds: string | string[],
    mediaType: string
): DeleteMediaParams {
    return {
        userId,
        mediaIds,
        mediaType,
    };
}
