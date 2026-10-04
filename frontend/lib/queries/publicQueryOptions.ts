/**
 * Query definitions shared by client hooks and server-side prefetches (page.tsx files that seed
 * the React Query cache so pages render with data in the HTML). Keep this module free of hooks
 * and client-only imports so server components can import it.
 */
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { categoryApi } from '@/lib/api/categories';
import { destinationApi } from '@/lib/api/destinations';
import { getTours, hasTourListFilters, type ToursResponse, type TourListFilters } from '@/lib/api/tours';
import { extractResponseData } from '@/lib/api/apiClient';
import { queryKeys, categoryKeys, destinationKeys } from './queryKeys';

/** Public tours page: infinite scroll. */
export const toursInfiniteOptions = (limit = 12, filters?: TourListFilters) => infiniteQueryOptions({
    queryKey: [...queryKeys.tours.all(), 'infinite', limit, hasTourListFilters(filters) ? filters : null],
    queryFn: ({ pageParam }: { pageParam: number }) => getTours({ pageParam: pageParam - 1, limit, filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: ToursResponse | undefined) =>
        lastPage?.pagination?.hasNextPage
            ? (lastPage.pagination.currentPage ?? 0) + 1
            : undefined,
    staleTime: 5 * 60 * 1000,
});

export const approvedCategoriesOptions = (params?: { page?: number; limit?: number; search?: string }) => queryOptions({
    queryKey: [...categoryKeys.approved(), params],
    queryFn: async () => {
        const response = await categoryApi.getApproved(params);
        return extractResponseData(response);
    },
});

export const approvedDestinationsOptions = (params?: {
    page?: number;
    limit?: number;
    country?: string;
    region?: string;
    search?: string;
}) => queryOptions({
    queryKey: [...destinationKeys.approved(), params],
    queryFn: async () => {
        const response = await destinationApi.getApproved(params);
        return extractResponseData(response);
    },
});
