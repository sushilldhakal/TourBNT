import { localApi, handleApiError, extractResponseData, formDataToObject } from './apiClient';

/**
 * Comments are owned end-to-end by the Next.js app (see
 * frontend/app/api/v1/comments and .../posts/[postId]/comments), backed by
 * Postgres — not proxied to Express.
 */

/**
 * Add a new comment to a post
 */
export const addComment = async (commentData: FormData, postId: string) => {
    try {
        const response = await localApi.post(`/posts/${postId}/comments`, formDataToObject(commentData));
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
        const response = await localApi.get('/comments');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching comments');
    }
};

/**
 * Edit an existing comment (approve/unapprove)
 */
export const editComment = async (commentData: FormData, commentId: string) => {
    try {
        const response = await localApi.patch(`/comments/${commentId}`, formDataToObject(commentData));
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
        const response = await localApi.get(`/posts/${postId}/comments`);
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
        const response = await localApi.delete(`/comments/${commentId}`);
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
        const response = await localApi.get('/comments/unapproved/count');
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
        const response = await localApi.post(`/comments/${commentId}/replies`, data);
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
        const response = await localApi.post(`/comments/${commentId}/likes`, { userId });
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
        const response = await localApi.patch(`/comments/${commentId}/view`);
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
        const response = await localApi.get(`/comments/${commentId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching comment with replies');
    }
};
