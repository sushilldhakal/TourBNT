import { getUserFacts } from '@/lib/api/factsApi';
import { useQuery } from '@tanstack/react-query';


export interface FactData {
    _id?: string;
    id?: string;
    name: string;
    label: string;
    field_type: string;
    value: string[] | string;
    icon?: string;
    userId: string;
}

export const useFacts = (userId: string | null) => {
    return useQuery<FactData[]>({
        queryKey: ['Facts', userId],
        queryFn: () => {
            if (!userId) {
                return Promise.reject('No user ID provided');
            }
            return getUserFacts(userId);
        },
        enabled: !!userId,
    });
};
