/**
 * useMediaUpload Hook
 * 
 * React Query mutation hook for uploading media files.
 * Handles file validation, upload progress, and cache invalidation.
 * 
 * Requirements: 2.2, 5.2
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadMedia, validateFiles } from '@/lib/api/mediaApi';
import { toast } from '@/components/ui/use-toast';
import type { UploadMediaParams, UploadResponse } from '@/components/dashboard/gallery/types';

/**
 * Hook options
 */
interface UseMediaUploadOptions {
    /**
     * Callback fired on successful upload
     */
    onSuccess?: (data: UploadResponse) => void;

    /**
     * Callback fired on upload error
     */
    onError?: (error: Error) => void;

    /**
     * Callback fired when upload starts (for optimistic UI)
     */
    onMutate?: (files: File[]) => void;

    /**
     * Callback fired when upload settles (success or error)
     */
    onSettled?: () => void;

    /**
     * Whether to show toast notifications
     * @default true
     */
    showToast?: boolean;

    /**
     * Accepted file types
     * @default { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'], 'video/*': ['.mp4', '.mov', '.avi'], 'application/pdf': ['.pdf'] }
     */
    acceptedTypes?: Record<string, string[]>;

    /**
     * Maximum file size in bytes
     * @default 10MB
     */
    maxSize?: number;

    /**
     * Maximum number of files
     * @default 10
     */
    maxFiles?: number;
}

/**
 * Default accepted file types
 */
const DEFAULT_ACCEPTED_TYPES = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    'application/pdf': ['.pdf'],
};

/**
 * Default max file size (10MB)
 */
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/**
 * Custom hook for uploading media files
 * 
 * Provides mutation function with automatic validation, error handling,
 * and cache invalidation. Shows toast notifications for success/error.
 * 
 * @param options - Upload options including callbacks and validation rules
 * @returns Mutation object with upload function and loading states
 * 
 * @example
 * ```tsx
 * const uploadMutation = useMediaUpload({
 *   onSuccess: (data) => console.log('Uploaded:', data.urls),
 * });
 * 
 * const handleUpload = (files: File[]) => {
 *   uploadMutation.mutate({ files, userId: 'user123' });
 * };
 * ```
 */
export function useMediaUpload(options: UseMediaUploadOptions = {}) {
    const {
        onSuccess,
        onError,
        onMutate,
        onSettled,
        showToast = true,
        acceptedTypes = DEFAULT_ACCEPTED_TYPES,
        maxSize = DEFAULT_MAX_SIZE,
        maxFiles = 10,
    } = options;

    const queryClient = useQueryClient();

    return useMutation<
        UploadResponse,
        Error,
        { files: File[]; userId: string }
    >({
        mutationFn: async ({ files, userId }) => {
            // Validate files before upload
            const { validFiles, errors } = validateFiles(
                files,
                acceptedTypes,
                maxSize,
                maxFiles
            );

            // Show validation errors
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

            // No valid files to upload
            if (validFiles.length === 0) {
                throw new Error('No valid files to upload');
            }

            // Create FormData with validated files
            const formData = new FormData();
            validFiles.forEach((file) => {
                formData.append('imageList', file);
            });

            // Upload files
            const params: UploadMediaParams = { formData, userId };
            return uploadMedia(params);
        },
        onMutate: ({ files }) => {
            // Call custom mutate handler for optimistic UI
            if (onMutate) {
                onMutate(files);
            }
        },
        onSuccess: (data) => {
            // Invalidate all media queries to refetch with new data
            // This ensures the gallery shows the newly uploaded files
            queryClient.invalidateQueries({
                queryKey: ['media'],
                // Refetch immediately to show new uploads
                refetchType: 'active'
            });

            // Show success toast
            if (showToast) {
                const count = data.resources?.length || data.urls?.length || 0;
                toast({
                    title: 'Upload Successful',
                    description: `${count} file${count !== 1 ? 's' : ''} uploaded successfully`,
                });
            }

            // Call custom success handler
            if (onSuccess) {
                onSuccess(data);
            }
        },
        onError: (error) => {
            // Determine error title based on error message
            let errorTitle = 'Upload Failed';

            if (error.message.includes('Cloudinary API key')) {
                errorTitle = 'Configuration Required';
            } else if (error.message.includes('file size') || error.message.includes('10MB')) {
                errorTitle = 'File Too Large';
            } else if (error.message.includes('file type') || error.message.includes('unsupported')) {
                errorTitle = 'Invalid File Type';
            } else if (error.message.includes('Network') || error.message.includes('connection')) {
                errorTitle = 'Network Error';
            } else if (error.message.includes('timeout')) {
                errorTitle = 'Upload Timeout';
            } else if (error.message.includes('Authentication')) {
                errorTitle = 'Authentication Required';
            } else if (error.message.includes('permission')) {
                errorTitle = 'Permission Denied';
            }

            // Show error toast with appropriate title
            if (showToast) {
                toast({
                    variant: 'destructive',
                    title: errorTitle,
                    description: error.message || 'Failed to upload files',
                });
            }

            // Call custom error handler
            if (onError) {
                onError(error);
            }
        },
        onSettled: () => {
            // Call custom settled handler
            if (onSettled) {
                onSettled();
            }
        },
    });
}

/**
 * Helper function to create FormData from files
 * 
 * @param files - Array of files to upload
 * @returns FormData ready for upload
 */
export function createUploadFormData(files: File[]): FormData {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append('imageList', file);
    });
    return formData;
}
