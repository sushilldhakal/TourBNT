/**
 * Comment queries – single source of truth for comment data fetching.
 */

import { useQuery } from '@tanstack/react-query';
import { getAllComments, getCommentsByPost, getCommentWithReplies } from '@/lib/api/comments';
import { queryKeys } from './queryKeys';

export function useAllComments() {
    return useQuery({
        queryKey: queryKeys.comments.all(),
        queryFn: getAllComments,
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
