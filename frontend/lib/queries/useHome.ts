import { useQuery } from '@tanstack/react-query';
import { getHomeFeed, type HomeFeed } from '@/lib/api/home';
import { queryKeys } from './queryKeys';

/** One request for every section on the public homepage. */
export function useHomeFeed() {
    return useQuery<HomeFeed>({
        queryKey: queryKeys.home.feed(),
        queryFn: getHomeFeed,
        staleTime: 1000 * 60 * 2,
    });
}
