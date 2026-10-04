/**
 * Facts queries – list and single fact.
 */

import { useQuery } from '@tanstack/react-query';
import { getUserFacts, getSingleFacts } from '@/lib/api/factsApi';
import { queryKeys } from './queryKeys';
import type { FactData } from '@/types/facts';

export function useFacts(userId: string | null, enabled = true) {
    // The API answers { success, data: FactData[] }; callers read `.data`.
    return useQuery<{ data?: FactData[] }>({
        queryKey: queryKeys.facts.list(userId),
        queryFn: async () => (await getUserFacts(userId!)) as { data?: FactData[] },
        enabled: !!userId && enabled,
        staleTime: 5 * 60 * 1000,
    });
}

export function useSingleFact(factId: string | null | undefined, enabled = true) {
    return useQuery<FactData>({
        queryKey: queryKeys.facts.detail(factId ?? ''),
        queryFn: () => getSingleFacts(factId!),
        enabled: !!factId && enabled,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });
}
