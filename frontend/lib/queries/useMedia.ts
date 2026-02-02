/**
 * useMedia Hook
 *
 * Unified hook combining query, upload, and delete operations for media management.
 * Consolidates useMediaQuery, useMediaUpload, and useMediaDelete into a single interface.
 */

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { getAllMedia, uploadMedia, deleteMedia, validateFiles } from '@/lib/api/mediaApi';
import { queryKeys } from './queryKeys';
import { useCacheManager } from './cacheUtils';
import { toast } from '@/components/ui/use-toast';
import type {
    MediaTab,
    MediaQueryResponse,
    UploadMediaParams,
    UploadResponse,
    DeleteMediaParams
} from '@/types/gallery';

interface UseMediaOptions {
    mediaType: MediaTab;
    enabled?: boolean;
    showToast?: boolean;
    upload?: {
        acceptedTypes?: Record<string, string[]>;
        maxSize?: number;
        maxFiles?: number;
        onSuccess?: (data: UploadResponse) => void;
        onError?: (error: Error) => void;
    };
    delete?: {
        onSuccess?: () => void;
        onError?: (error: Error) => void;
    };
}

const DEFAULT_ACCEPTED_TYPES = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    'application/pdf': ['.pdf'],
};

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

export function useMedia(options: UseMediaOptions) {
    const {
        mediaType,
        enabled = true,
        showToast = true,
        upload: uploadOptions,
        delete: deleteOptions,
    } = options;

    const cache = useCacheManager();

    const query = useInfiniteQuery<MediaQueryResponse, Error>({
        queryKey: queryKeys.media.list(mediaType),
        queryFn: async ({ pageParam = 1 }) => {
            try {
                const result = await getAllMedia({
                    pageParam: pageParam as number,
                    mediaType
                });
                return result;
            } catch (error: any) {
                const statusCode = error.statusCode || error.response?.status;
                const errorMessage = error.message || error.response?.data?.message;

                if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || errorMessage?.toLowerCase().includes('network')) {
                    throw new Error('Network error occurred while loading media. Please check your internet connection and try again.');
                }
                if (error.code === 'ETIMEDOUT' || errorMessage?.toLowerCase().includes('timeout')) {
                    throw new Error('Request timed out while loading media. Please try again.');
                }
                if (statusCode === 401) {
                    throw new Error('Authentication required. Please log in to view media.');
                }
                if (statusCode === 403) {
                    throw new Error('You do not have permission to view this media. Please contact your administrator.');
                }
                if (statusCode >= 500) {
                    throw new Error('Server error occurred while loading media. Please try again later.');
                }
                throw new Error(errorMessage || 'Failed to load media. Please try again.');
            }
        },
        getNextPageParam: (lastPage) => {
            const pagination = lastPage?.pagination;
            if (!pagination || typeof pagination.totalPages !== 'number') return undefined;
            const page = typeof pagination.page === 'number' ? pagination.page : 1;
            const totalPages = Math.max(0, pagination.totalPages);
            if (totalPages === 0 || page >= totalPages) return undefined;
            return page + 1;
        },
        initialPageParam: 1,
        enabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
            if (error.message.includes('Authentication') || error.message.includes('permission')) {
                return false;
            }
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        structuralSharing: true,
        placeholderData: (previousData) => previousData,
    });

    const uploadMutation = useMutation<
        UploadResponse,
        Error,
        File[]
    >({
        mutationFn: async (files: File[]) => {
            const acceptedTypes = uploadOptions?.acceptedTypes || DEFAULT_ACCEPTED_TYPES;
            const maxSize = uploadOptions?.maxSize || DEFAULT_MAX_SIZE;
            const maxFiles = uploadOptions?.maxFiles || 10;

            const { validFiles, errors } = validateFiles(files, acceptedTypes, maxSize, maxFiles);

            if (errors.length > 0) {
                const errorMessage = errors.join('\n');
                if (showToast) {
                    toast({
                        variant: 'destructive',
                        title: 'File Validation Failed',
                        description: errorMessage,
                    });
                }
                throw new Error(errorMessage);
            }

            if (validFiles.length === 0) {
                throw new Error('No valid files to upload');
            }

            const formData = new FormData();
            validFiles.forEach((file) => {
                formData.append('imageList', file);
            });

            const params: UploadMediaParams = { formData };
            const result = await uploadMedia(params);
            return {
                ...result,
                uploadedCount: validFiles.length,
            };
        },
        onSuccess: (data, variables) => {
            cache.invalidateMedia();

            if (showToast) {
                let count = (data as any).uploadedCount ?? variables.length;
                toast({
                    title: 'Upload Successful',
                    description: `${count} file${count !== 1 ? 's' : ''} uploaded successfully`,
                });
            }
            uploadOptions?.onSuccess?.(data);
        },
        onError: (error) => {
            let errorTitle = 'Upload Failed';
            if (error.message.includes('Cloudinary API key')) errorTitle = 'Configuration Required';
            else if (error.message.includes('file size') || error.message.includes('10MB')) errorTitle = 'File Too Large';
            else if (error.message.includes('file type') || error.message.includes('unsupported')) errorTitle = 'Invalid File Type';
            else if (error.message.includes('Network') || error.message.includes('connection')) errorTitle = 'Network Error';
            else if (error.message.includes('timeout')) errorTitle = 'Upload Timeout';
            else if (error.message.includes('Authentication')) errorTitle = 'Authentication Required';
            else if (error.message.includes('permission')) errorTitle = 'Permission Denied';

            if (showToast) {
                toast({
                    variant: 'destructive',
                    title: errorTitle,
                    description: error.message || 'Failed to upload files',
                });
            }
            uploadOptions?.onError?.(error);
        },
    });

    const deleteMutation = useMutation<void, Error, DeleteMediaParams>({
        mutationFn: async (params: DeleteMediaParams) => deleteMedia(params),
        onSuccess: (_, variables) => {
            cache.invalidateMedia();

            if (showToast) {
                const count = Array.isArray(variables.mediaIds) ? variables.mediaIds.length : 1;
                toast({
                    title: 'Deletion Successful',
                    description: `${count} item${count !== 1 ? 's' : ''} deleted successfully`,
                });
            }
            deleteOptions?.onSuccess?.();
        },
        onError: (error) => {
            let errorTitle = 'Deletion Failed';
            if (error.message.includes('Authentication') || error.message.includes('session')) errorTitle = 'Authentication Required';
            else if (error.message.includes('not found') || error.message.includes('does not exist')) errorTitle = 'Media Not Found';
            else if (error.message.includes('permission') || error.message.includes('administrator')) errorTitle = 'Permission Denied';
            else if (error.message.includes('Network') || error.message.includes('connection')) errorTitle = 'Network Error';
            else if (error.message.includes('timeout')) errorTitle = 'Request Timeout';
            else if (error.message.includes('Server error')) errorTitle = 'Server Error';
            else if (error.message.includes('cloud storage')) errorTitle = 'Storage Error';

            if (showToast) {
                toast({
                    variant: 'destructive',
                    title: errorTitle,
                    description: error.message || 'Failed to delete media',
                });
            }
            deleteOptions?.onError?.(error);
        },
    });

    const items = query.data?.pages.flatMap((page) => page.items || []) ?? [];
    const totalCount = query.data?.pages[0]?.pagination?.totalItems ?? 0;
    const loadMore = () => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
            query.fetchNextPage();
        }
    };

    return {
        items,
        totalCount,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        hasMore: query.hasNextPage ?? false,
        isFetchingMore: query.isFetchingNextPage,
        loadMore,
        upload: (files: File[]) => uploadMutation.mutate(files),
        delete: (mediaIds: string | string[]) => deleteMutation.mutate({ mediaIds, mediaType }),
        refetch: query.refetch,
        isUploading: uploadMutation.isPending,
        isDeleting: deleteMutation.isPending,
        uploadError: uploadMutation.error,
        deleteError: deleteMutation.error,
        query,
    };
}

export function getFlattenedMedia(data: any) {
    if (!data?.pages) return [];
    return data.pages.flatMap((page: MediaQueryResponse) => page.resources);
}

export function getMediaCount(data: any): number {
    if (!data?.pages || data.pages.length === 0) return 0;
    const firstPage = data.pages[0] as MediaQueryResponse;
    if (firstPage.totalCount !== undefined) return firstPage.totalCount;
    return data.pages.reduce(
        (total: number, page: MediaQueryResponse) => total + (page.resources?.length || 0),
        0
    );
}
