/**
 * Company info query – footer, public pages.
 */

import { useQuery } from '@tanstack/react-query';
import { getCompanyInfo } from '@/lib/api/companyApi';
import { queryKeys } from './queryKeys';

export function useCompanyInfo() {
    return useQuery({
        queryKey: queryKeys.company.info(),
        queryFn: getCompanyInfo,
        staleTime: 1000 * 60 * 10,
    });
}
