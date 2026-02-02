/**
 * Review queries – tour reviews, approved reviews.
 */

import { useQuery } from '@tanstack/react-query';
import { getTourReviews, getApprovedReviews } from '@/lib/api/reviews';
import { queryKeys } from './queryKeys';

export function useTourReviews(tourId: string | undefined, status?: string, enabled = true) {
    return useQuery({
        queryKey: [...queryKeys.reviews.tour(tourId ?? ''), status],
        queryFn: () => getTourReviews(tourId!, status),
        enabled: !!tourId && enabled,
        staleTime: 1000 * 60 * 2,
    });
}

export function useApprovedReviews(limit?: number) {
    return useQuery({
        queryKey: queryKeys.reviews.approved(limit),
        queryFn: () => getApprovedReviews(limit),
        staleTime: 1000 * 60 * 2,
    });
}
