/**
 * useTourMutation Hook
 * Custom hook for tour CRUD operations with React Query
 * Handles create, update, and delete mutations with FormData processing
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createTour, updateTour, deleteTour } from '@/lib/api/tours';
import { toast } from '@/components/ui/use-toast';
import { TourFormData, TourEditData } from '@/lib/schemas/tourEditor';

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
    processFormData: (values: TourFormData | TourEditData, editorContent?: any, inclusionsContent?: any, exclusionsContent?: any) => FormData;
}

/**
 * Process form values into FormData for API submission
 * Handles file uploads, JSON serialization, and nested objects
 */
export function processFormData(
    values: TourFormData | TourEditData,
    editorContent?: any,
    inclusionsContent?: any,
    exclusionsContent?: any
): FormData {
    const formData = new FormData();

    // Process each field
    Object.keys(values).forEach((key) => {
        const value = (values as any)[key];

        // Skip undefined or null values
        if (value === undefined || value === null) {
            return;
        }

        // Handle special cases
        switch (key) {
            case 'description':
                // Use editor content if available, otherwise use form value
                if (editorContent) {
                    formData.append(key, JSON.stringify(editorContent));
                } else if (value) {
                    formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
                }
                break;

            case 'include':
                // Use inclusions content if available
                if (inclusionsContent) {
                    formData.append(key, JSON.stringify(inclusionsContent));
                } else if (value) {
                    formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
                }
                break;

            case 'exclude':
                // Use exclusions content if available
                if (exclusionsContent) {
                    formData.append(key, JSON.stringify(exclusionsContent));
                } else if (value) {
                    formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
                }
                break;

            case 'coverImage':
                // Handle file upload
                if (value instanceof File) {
                    formData.append('file', value);
                } else if (typeof value === 'string' && value) {
                    formData.append(key, value);
                }
                break;

            case 'file':
                // Handle file upload
                if (value instanceof File) {
                    formData.append('file', value);
                } else if (value instanceof FileList && value.length > 0) {
                    formData.append('file', value[0]);
                }
                break;

            case 'gallery':
                // Handle gallery images
                if (Array.isArray(value)) {
                    // Separate new files from existing URLs
                    const existingImages: any[] = [];
                    const newFiles: File[] = [];

                    value.forEach((item: any) => {
                        if (item instanceof File) {
                            newFiles.push(item);
                        } else if (item?.image) {
                            existingImages.push(item);
                        }
                    });

                    // Append existing images as JSON
                    if (existingImages.length > 0) {
                        formData.append('gallery', JSON.stringify(existingImages));
                    }

                    // Append new files
                    newFiles.forEach((file) => {
                        formData.append('galleryImages', file);
                    });
                }
                break;

            case 'category':
                // Handle category array
                if (Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                }
                break;

            case 'facts':
                // Handle facts array
                if (Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                }
                break;

            case 'faqs':
                // Handle FAQs array
                if (Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                }
                break;

            case 'itinerary':
                // Handle itinerary object or array
                if (value) {
                    formData.append(key, JSON.stringify(value));
                }
                break;

            case 'pricing':
                // Handle pricing object
                if (typeof value === 'object') {
                    formData.append(key, JSON.stringify(value));
                }
                break;

            case 'dates':
                // Handle dates object
                if (typeof value === 'object') {
                    formData.append(key, JSON.stringify(value));
                }
                break;

            case 'location':
                // Handle location object
                if (typeof value === 'object') {
                    formData.append(key, JSON.stringify(value));
                }
                break;

            default:
                // Handle primitive values
                if (typeof value === 'object' && !Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                } else if (Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
                break;
        }
    });

    return formData;
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
    const queryClient = useQueryClient();

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (formData: FormData) => createTour(formData),
        onSuccess: (data: any) => {
            toast({
                title: 'Success!',
                description: 'Tour created successfully',
            });

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['tours'] });

            // Call custom success handler if provided
            if (onSuccess) {
                onSuccess(data);
            } else {
                // Default behavior: redirect to edit page or tours list
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

            // Call custom error handler if provided
            if (onError) {
                onError(error);
            }
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (formData: FormData) => {
            if (!tourId) {
                throw new Error('Tour ID is required for update');
            }
            return updateTour(tourId, formData);
        },
        onSuccess: (data: any) => {
            toast({
                title: 'Success!',
                description: 'Tour updated successfully',
            });

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['tours'] });
            queryClient.invalidateQueries({ queryKey: ['tour', tourId] });

            // Call custom success handler if provided
            if (onSuccess) {
                onSuccess(data);
            }
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error updating tour',
                description: error.message || 'Failed to update tour',
            });

            // Call custom error handler if provided
            if (onError) {
                onError(error);
            }
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: () => {
            if (!tourId) {
                throw new Error('Tour ID is required for delete');
            }
            return deleteTour(tourId);
        },
        onSuccess: (data: any) => {
            toast({
                title: 'Success!',
                description: 'Tour deleted successfully',
            });

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['tours'] });

            // Call custom success handler if provided
            if (onSuccess) {
                onSuccess(data);
            } else {
                // Default behavior: redirect to tours list
                router.push('/dashboard/tours');
            }
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error deleting tour',
                description: error.message || 'Failed to delete tour',
            });

            // Call custom error handler if provided
            if (onError) {
                onError(error);
            }
        },
    });

    return {
        createMutation,
        updateMutation,
        deleteMutation,
        isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
        processFormData,
    };
}
