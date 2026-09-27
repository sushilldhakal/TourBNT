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
 * Get all comments (admin)
 * Uses limit=all to fetch all comments for client-side pagination
 */
export const getAllComments = async () => {
    try {
        const response = await api.get('/comments', {
            params: {
                limit: 'all', // Triggers hybrid pagination on backend
            }
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching comments');
    }
};

/**
 * Edit an existing comment
 */
export const editComment = async (commentData: FormData, commentId: string) => {
    try {
        const response = await api.patch(`/comments/${commentId}`, commentData, {
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
        const response = await api.delete(`/comments/${commentId}`);
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
