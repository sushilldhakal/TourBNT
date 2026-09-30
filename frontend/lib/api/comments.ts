import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Add a new comment to a post
 */
export const addComment = async (commentData: FormData, postId: string) => {
    try {
        const response = await api.post(`/posts/${postId}/comments`, commentData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding comment');
    }
};

/**
 * Get one page of comments (admin sees all, sellers see comments on their posts).
 * Paging and text search happen on the server.
 */
export const getCommentsPage = async (params: { page: number; limit: number; q?: string }) => {
    try {
        const response = await api.get('/comments', {
            params: { page: params.page, limit: params.limit, ...(params.q ? { q: params.q } : {}) },
        });
        return extractResponseData<{ data?: unknown[]; pagination?: { totalItems: number; totalPages: number } }>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching comments');
    }
};

/**
 * Edit an existing comment
 */
export const editComment = async (commentData: FormData, commentId: string) => {
    try {
        // The registered route is /posts/comment/:commentId — /comments/:commentId
        // was never mounted for this handler.
        const response = await api.patch(`/posts/comment/${commentId}`, commentData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'editing comment');
    }
};

/**
 * Get all comments for a specific post
 */
export const getCommentsByPost = async (postId: string) => {
    if (!postId || postId === 'undefined') {
        throw new Error('Post ID is required');
    }
    try {
        const response = await api.get(`/posts/${postId}/comments`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching post comments');
    }
};

/**
 * Delete a comment
 */
export const deleteComment = async (commentId: string) => {
    if (!commentId || commentId.trim() === '') {
        throw new Error('Comment ID is required to delete a comment');
    }
    try {
        // The registered route is /posts/comment/:commentId — /comments/:commentId
        // was never mounted for this handler.
        const response = await api.delete(`/posts/comment/${commentId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting comment');
    }
};

/**
 * Get count of unapproved comments
 */
export const getUnapprovedCommentsCount = async () => {
    try {
        const response = await api.get('/comments/unapproved/count');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching unapproved comments count');
    }
};

/**
 * Add a reply to a comment
 */
export const addReply = async (
    data: { text: string; user: string; post: string },
    commentId: string
) => {
    try {
        const response = await api.post(`/comments/${commentId}/replies`, data);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'adding reply');
    }
};

/**
 * Like a comment
 */
export const likeComment = async (commentId: string, userId: string) => {
    try {
        const response = await api.post(`/comments/${commentId}/likes`, { userId });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'liking comment');
    }
};

/**
 * Get a comment with all its replies
 */
export const getCommentWithReplies = async (commentId: string) => {
    try {
        const response = await api.get(`/comments/${commentId}/replies`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching comment with replies');
    }
};
