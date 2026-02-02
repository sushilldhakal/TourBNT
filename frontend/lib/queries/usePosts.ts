/**
 * Post queries – single source of truth for post data fetching.
 */

import { useQuery } from '@tanstack/react-query';
import { getPosts, getAllUserPosts, getSinglePost } from '@/lib/api/posts';
import { queryKeys } from './queryKeys';
import type { PostsListResponse } from '@/types/post';

export function usePublicPosts(params?: { page?: number; limit?: number }) {
    return useQuery({
        queryKey: [...queryKeys.posts.all(), params],
        queryFn: () => getPosts(params),
        staleTime: 1000 * 60 * 2,
    });
}

export function useUserPosts(params?: { page?: number; limit?: number }) {
    return useQuery<PostsListResponse>({
        queryKey: [...queryKeys.posts.all(), 'user', params],
        queryFn: async () => (await getAllUserPosts(params ?? { page: 1, limit: 10 })) as PostsListResponse,
        staleTime: 1000 * 60 * 2,
    });
}

export function usePostById(postId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.posts.detail(postId ?? ''),
        queryFn: () => getSinglePost(postId!),
        enabled: !!postId && enabled,
        staleTime: 1000 * 60 * 2,
    });
}
