/**
 * useMediaUpdate Hook
 *
 * React Query mutation hook for updating media metadata.
 * Handles title, description, and tags updates.
 */

import { useMutation } from '@tanstack/react-query';
import { updateMedia } from '@/lib/api/mediaApi';
import { useCacheManager } from './cacheUtils';
import { toast } from '@/components/ui/use-toast';
import type { UpdateMediaParams } from '@/types/gallery';

interface UseMediaUpdateOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    showToast?: boolean;
}

export function useMediaUpdate(options: UseMediaUpdateOptions = {}) {
    const {
        onSuccess,
        onError,
        showToast = true,
    } = options;

    const cache = useCacheManager();

    return useMutation<void, Error, UpdateMediaParams>({
        mutationFn: async (params: UpdateMediaParams) => {
            return updateMedia(params);
        },
        onSuccess: () => {
            cache.invalidateMedia();

            if (showToast) {
                toast({
                    title: 'Update Successful',
                    description: 'Media metadata has been updated',
                });
            }

            if (onSuccess) {
                onSuccess();
            }
        },
        onError: (error) => {
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

            if (showToast) {
                toast({
                    variant: 'destructive',
                    title: errorTitle,
                    description: error.message || 'Failed to update media',
                });
            }

            if (onError) {
                onError(error);
            }
        },
    });
}
