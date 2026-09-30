/**
 * Comment queries – single source of truth for comment data fetching.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCommentsPage, getCommentsByPost, getCommentWithReplies } from '@/lib/api/comments';
import { queryKeys } from './queryKeys';

export function useCommentsPage(params: { page: number; limit: number; q?: string }) {
    return useQuery({
        queryKey: [...queryKeys.comments.all(), 'page', params],
        queryFn: () => getCommentsPage(params),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 2,
    });
}

export function useCommentsByPost(postId: string | undefined, enabled = true) {
    const hasValidId = !!postId && postId !== 'undefined';
    return useQuery({
        queryKey: queryKeys.comments.list(postId ?? ''),
        queryFn: () => getCommentsByPost(postId!),
        enabled: hasValidId && enabled,
        staleTime: 1000 * 60 * 2,
    });
}

export function useCommentWithReplies(commentId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: queryKeys.comments.replies(commentId ?? ''),
        queryFn: () => getCommentWithReplies(commentId!),
        enabled: !!commentId && enabled,
        staleTime: 1000 * 60 * 2,
    });
}
