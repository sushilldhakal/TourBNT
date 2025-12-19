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
        queryFn: () => getUserFacts(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // optional
    });
};
