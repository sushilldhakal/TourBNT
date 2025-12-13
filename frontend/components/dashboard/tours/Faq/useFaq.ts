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
        queryFn: () => {
            if (!userId) {
                return Promise.reject('No user ID provided');
            }
            return getUserFaq(userId);
        },
        enabled: !!userId,
    });
};
