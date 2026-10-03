/**
 * Tour queries – public list, count, latest, detail.
 * Tour mutations and useTourQuery live in useTourMutation.
 */

import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { getTours, getLatestTours, getTourTitlesByIds, getMyTours, getTourLogisticsStatus } from '@/lib/api/tours';
import { queryKeys } from './queryKeys';
import { toursInfiniteOptions } from './publicQueryOptions';
import type { ToursResponse, TourItineraryRequestStatus, TourListFilters } from '@/lib/api/tours';
import type { TourTitle } from '@/types/types';

export function useTours(params?: { pageParam?: number; limit?: number }) {
    return useQuery<ToursResponse>({
        queryKey: [...queryKeys.tours.all(), params],
        queryFn: () => getTours({ pageParam: params?.pageParam ?? 0, limit: params?.limit ?? 6 }),
        staleTime: 1000 * 60 * 2,
    });
}

/** Public tours page: infinite scroll */
/** Public tour list with infinite scroll; with filters the server does the searching. */
export function useToursInfinite(limit = 12, filters?: TourListFilters) {
    return useInfiniteQuery({ ...toursInfiniteOptions(limit, filters), placeholderData: keepPreviousData });
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

/** Read-only per-day hotel/restaurant/guide/transport confirmation status — only meaningful once the tour has fixed departures. */
export function useTourLogisticsStatus(tourId: string | undefined, enabled = true) {
    return useQuery<TourItineraryRequestStatus[]>({
        queryKey: queryKeys.businessPartners.tourLogisticsStatus(tourId ?? ''),
        queryFn: () => getTourLogisticsStatus(tourId!),
        enabled: enabled && !!tourId,
        staleTime: 30_000,
    });
}
