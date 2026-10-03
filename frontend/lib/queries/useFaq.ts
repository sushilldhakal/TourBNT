/**
 * FAQ queries – list and single FAQ.
 */

import { useQuery } from '@tanstack/react-query';
import { getUserFaq, getSingleFaq } from '@/lib/api/faqApi';
import { queryKeys } from './queryKeys';
import type { FaqData } from '@/types/faq';

export function useFaq(userId: string | null, enabled = true) {
    // The API answers { success, data: FaqData[] }; callers read `.data`.
    return useQuery<{ data?: FaqData[] }>({
        queryKey: queryKeys.faq.list(userId),
        queryFn: () => getUserFaq(userId!),
        enabled: !!userId && enabled,
        staleTime: 5 * 60 * 1000,
    });
}

export function useSingleFaq(faqId: string | null | undefined, enabled = true) {
    return useQuery<FaqData | { faq: FaqData }>({
        queryKey: queryKeys.faq.detail(faqId ?? ''),
        queryFn: () => getSingleFaq(faqId!),
        enabled: !!faqId && enabled,
        staleTime: 5 * 60 * 1000,
    });
}
