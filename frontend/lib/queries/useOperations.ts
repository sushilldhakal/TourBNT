import { useQuery } from '@tanstack/react-query';
import { getOperationsSummary } from '@/lib/api/operations';

export function useOperationsSummary(enabled = true) {
    return useQuery({
        queryKey: ['operations', 'summary'],
        queryFn: getOperationsSummary,
        enabled,
        staleTime: 30 * 1000,
    });
}
