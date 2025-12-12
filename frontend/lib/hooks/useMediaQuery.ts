/**
 * useMediaQuery Hook
 * 
 * React Query hook for fetching media with infinite scroll pagination.
 * Provides automatic caching, refetching, and loading states.
 * 
 * Requirements: 1.4, 10.1
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { getAllMedia } from '@/lib/api/mediaApi';
import type { MediaTab, MediaQueryResponse } from '@/components/dashboard/gallery/types';

/**
 * Hook options
 */
interface UseMediaQueryOptions {
    /**
     * Media type to filter by
     */
    mediaType: MediaTab;

    /**
     * Whether to enable the query
     * @default true
     */
    enabled?: boolean;

    /**
     * Stale time in milliseconds
     * @default 5 minutes
     */
    staleTime?: number;
}

/**
 * Custom hook for fetching media with infinite scroll
 * 
 * Uses React Query's useInfiniteQuery for cursor-based pagination.
 * Automatically handles loading states, errors, and cache management.
 * 
 * Requirements: 1.4, 10.1, 9.4
 * 
 * @param options - Query options including media type and enabled state
 * @returns Query result with data, loading states, and pagination functions
 * 
 * @example
 * ```tsx
 * const { data, isLoading, fetchNextPage, hasNextPage } = useMediaQuery({
 *   mediaType: 'images'
 * });
 * ```
 */
export function useMediaQuery(options: UseMediaQueryOptions) {
    const { mediaType, enabled = true, staleTime = 5 * 60 * 1000 } = options;

    return useInfiniteQuery<MediaQueryResponse, Error>({
        queryKey: ['media', mediaType],
        queryFn: async ({ pageParam = 1 }) => {
            try {
                return await getAllMedia({
                    pageParam: pageParam as number,
                    mediaType
                });
            } catch (error: any) {
                // Enhance error messages for better user feedback
                const statusCode = error.statusCode || error.response?.status;
                const errorMessage = error.message || error.response?.data?.message;

                // Network errors
                if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || errorMessage?.toLowerCase().includes('network')) {
                    throw new Error(
                        'Network error occurred while loading media. Please check your internet connection and try again.'
                    );
                }

                // Timeout errors
                if (error.code === 'ETIMEDOUT' || errorMessage?.toLowerCase().includes('timeout')) {
                    throw new Error(
                        'Request timed out while loading media. Please try again.'
                    );
                }

                // Authentication errors
                if (statusCode === 401) {
                    throw new Error(
                        'Authentication required. Please log in to view media.'
                    );
                }

                // Permission errors
                if (statusCode === 403) {
                    throw new Error(
                        'You do not have permission to view this media. Please contact your administrator.'
                    );
                }

                // Server errors
                if (statusCode >= 500) {
                    throw new Error(
                        'Server error occurred while loading media. Please try again later.'
                    );
                }

                // Generic error
                throw new Error(
                    errorMessage || 'Failed to load media. Please try again.'
                );
            }
        },
        getNextPageParam: (lastPage) => {
            // Return undefined if no more pages (stops infinite query)
            return lastPage.nextCursor ?? undefined;
        },
        initialPageParam: 1,
        enabled,
        // Optimized stale time - data stays fresh for 5 minutes
        staleTime,
        // Cache time (gcTime) - keep data in cache for 10 minutes after last use
        gcTime: 10 * 60 * 1000,
        // Refetch on window focus only if data is stale
        refetchOnWindowFocus: 'always',
        // Don't refetch on mount if we have cached data
        refetchOnMount: false,
        // Refetch on reconnect only if data is stale
        refetchOnReconnect: true,
        // Retry failed requests up to 2 times with exponential backoff
        retry: (failureCount, error) => {
            // Don't retry on authentication or permission errors
            if (error.message.includes('Authentication') || error.message.includes('permission')) {
                return false;
            }
            // Retry up to 2 times for other errors
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Enable structural sharing to prevent unnecessary re-renders
        structuralSharing: true,
        // Keep previous data while fetching new data (better UX)
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Helper hook to get flattened media items from infinite query
 * 
 * Extracts all media items from paginated results into a single array.
 * 
 * @param data - Infinite query data
 * @returns Flattened array of media items
 */
export function useFlattenedMedia(data: any) {
    if (!data?.pages) {
        return [];
    }

    return data.pages.flatMap((page: MediaQueryResponse) => page.resources);
}

/**
 * Helper hook to get total count from infinite query
 * 
 * @param data - Infinite query data
 * @returns Total count of media items
 */
export function useMediaCount(data: any): number {
    if (!data?.pages || data.pages.length === 0) {
        return 0;
    }

    // Use totalCount from first page if available
    const firstPage = data.pages[0] as MediaQueryResponse;
    if (firstPage.totalCount !== undefined) {
        return firstPage.totalCount;
    }

    // Otherwise count all loaded items
    return data.pages.reduce(
        (total: number, page: MediaQueryResponse) => total + page.resources.length,
        0
    );
}
