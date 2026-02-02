/**
 * Tour queries – public list, count, latest, detail.
 * Tour mutations and useTourQuery live in useTourMutation.
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getTours, getLatestTours, getTourTitlesByIds, getMyTours } from '@/lib/api/tours';
import { queryKeys } from './queryKeys';
import type { ToursResponse } from '@/lib/api/tours';
import type { TourTitle } from '@/types/types';

export function useTours(params?: { pageParam?: number; limit?: number }) {
    return useQuery<ToursResponse>({
        queryKey: [...queryKeys.tours.all(), params],
        queryFn: () => getTours({ pageParam: params?.pageParam ?? 0, limit: params?.limit ?? 6 }),
        staleTime: 1000 * 60 * 2,
    });
}

/** Public tours page: infinite scroll */
export function useToursInfinite(limit = 12) {
    return useInfiniteQuery({
        queryKey: [...queryKeys.tours.all(), 'infinite', limit],
        queryFn: ({ pageParam }: { pageParam: number }) =>
            getTours({ pageParam: pageParam - 1, limit }),
        initialPageParam: 1,
        getNextPageParam: (lastPage: ToursResponse) =>
            lastPage?.pagination?.hasNextPage
                ? (lastPage.pagination.currentPage ?? 0) + 1
                : undefined,
        staleTime: 5 * 60 * 1000,
    });
}

/** Seller dashboard: my tours list (paginated) */
export function useMyTours(params?: { page?: number; pageSize?: number }) {
    const page = params?.page ?? 0;
    const pageSize = params?.pageSize ?? 10;
    return useQuery<ToursResponse>({
        queryKey: [...queryKeys.tours.myTours(), page, pageSize],
        queryFn: () => getMyTours({ pageParam: page, limit: pageSize }),
        staleTime: 1000 * 60 * 2,
    });
}

/** Dashboard stats: tours count (limit 1) */
export function useToursCount() {
    return useQuery<ToursResponse>({
        queryKey: [...queryKeys.tours.all(), 'count'],
        queryFn: () => getTours({ pageParam: 0, limit: 1 }),
        staleTime: 1000 * 60 * 5,
    });
}

export function useLatestTours() {
    return useQuery({
        queryKey: [...queryKeys.tours.all(), 'latest'],
        queryFn: getLatestTours,
        staleTime: 1000 * 60 * 2,
    });
}

export function useTourTitlesByIds(ids: string[], enabled = true) {
    return useQuery<TourTitle[]>({
        queryKey: queryKeys.tours.titlesByIds(ids),
        queryFn: () => getTourTitlesByIds(ids) as Promise<TourTitle[]>,
        enabled: enabled && ids.length > 0,
        staleTime: 60_000,
    });
}
