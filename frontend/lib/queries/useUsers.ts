/**
 * User queries – single source of truth for user data fetching.
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getUsers, getUserById, getCurrentUser, getMySettings } from '@/lib/api/users';
import { queryKeys } from './queryKeys';

export function useUserById(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.users.detail(userId ?? ''),
        queryFn: () => getUserById(userId!),
        enabled: !!userId && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useUsersInfinite(limit = 50) {
    return useInfiniteQuery({
        queryKey: ['users', 'infinite'],
        queryFn: ({ pageParam }: { pageParam: number }) => getUsers({ page: pageParam, limit }),
        initialPageParam: 1,
        getNextPageParam: (lastPage: unknown) => {
            if (typeof lastPage === 'object' && lastPage !== null) {
                if ('pagination' in lastPage) {
                    const pagination = (lastPage as { pagination?: { currentPage?: number; page?: number; totalPages?: number } }).pagination;
                    if (pagination) {
                        const currentPage = pagination.currentPage ?? pagination.page;
                        if (typeof currentPage === 'number' && typeof pagination.totalPages === 'number' && currentPage < pagination.totalPages) {
                            return currentPage + 1;
                        }
                    }
                }
                if ('data' in lastPage && typeof (lastPage as { data?: unknown }).data === 'object') {
                    const data = (lastPage as { data: { pagination?: { currentPage?: number; page?: number; totalPages?: number } } }).data;
                    if (data?.pagination) {
                        const currentPage = data.pagination.currentPage ?? data.pagination.page;
                        if (typeof currentPage === 'number' && typeof data.pagination.totalPages === 'number' && currentPage < data.pagination.totalPages) {
                            return currentPage + 1;
                        }
                    }
                }
            }
            return undefined;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useCurrentUserProfile(enabled = true) {
    return useQuery({
        queryKey: queryKeys.users.currentUser(),
        queryFn: getCurrentUser,
        enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useUserSettings(userId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.userSettings.all(),
        queryFn: () => getMySettings(),
        enabled: !!userId && enabled,
        staleTime: 1000 * 60 * 5,
    });
}
