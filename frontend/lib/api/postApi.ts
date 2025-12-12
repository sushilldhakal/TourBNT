import { api, handleApiError } from './apiClient';

/**
 * Fetch all posts
 */
export const getPost = async () => {
    try {
        const timestamp = new Date().getTime();
        const response = await api.get(`/api/posts?_t=${timestamp}`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching posts');
    }
};

/**
 * Fetch a single post by ID
 */
export const getSinglePost = async (postId: string) => {
    try {
        const timestamp = new Date().getTime();
        const response = await api.get(`/api/posts/${postId}?_t=${timestamp}`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'fetching post');
    }
};

/**
 * Like a post
 */
export const likePost = async (postId: string, userId: string) => {
    try {
        const response = await api.patch(`/api/posts/like/${postId}`, { userId });
        return response.data;
    } catch (error) {
        handleApiError(error, 'liking post');
    }
};

/**
 * Track post view
 */
export const viewPost = async (postId: string) => {
    try {
        const response = await api.patch(`/api/posts/view/${postId}`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'tracking post view');
    }
};
