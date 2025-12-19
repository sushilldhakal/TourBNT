import { getUserFaq } from '@/lib/api/faqApi';
import { useQuery } from '@tanstack/react-query';

export interface FaqData {
    id: string;
    _id?: string;
    question: string;
    answer: string;
    userId: string;
    createdAt?: string;
    updatedAt?: string;
}

export const useFaq = (userId: string | null) => {
    return useQuery<FaqData[]>({
        queryKey: ['Faq', userId],
        queryFn: () => getUserFaq(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // optional
    });
};
