import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Comment API Methods
 * Migrated from dashboard/src/http/commentApi.ts
 * Follows server API specifications from API_DOCUMENTATION.md
 */

/**
 * Add a new comment to a post
 */
export const addComment = async (commentData: FormData, postId: string) => {
    try {
        const response = await api.post(`/posts/comment/${postId}`, commentData, {
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
 */
export const getAllComments = async () => {
    try {
        const response = await api.get('/comments');
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
    try {
        const response = await api.get(`/posts/comment/post/${postId}`);
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
        const response = await api.get('/posts/comment/unapproved/count');
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
        const response = await api.post(`/posts/comment/reply/${commentId}`, data);
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
        const response = await api.patch(`/posts/comment/like/${commentId}`, { userId });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'liking comment');
    }
};

/**
 * Increment view count for a comment
 */
export const viewComment = async (commentId: string) => {
    try {
        const response = await api.patch(`/posts/comment/view/${commentId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'tracking comment view');
    }
};

/**
 * Get a comment with all its replies
 */
export const getCommentWithReplies = async (commentId: string) => {
    try {
        const response = await api.get(`/posts/comment/${commentId}/replies`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching comment with replies');
    }
};
