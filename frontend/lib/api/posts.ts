import { localApi, handleApiError, extractResponseData, formDataToObject } from './apiClient';

/**
 * Posts are owned end-to-end by the Next.js app (see frontend/app/api/v1/posts),
 * backed by Postgres — not proxied to Express. This is also what makes
 * comments (which reference posts.id directly) work as a self-contained
 * Postgres resource.
 */

/**
 * Get all posts public
 */
export const getPosts = async () => {
    try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await localApi.get(`/posts?_t=${timestamp}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching posts');
    }
};

/**
 * Get all posts (alias for getPosts)
 */
export const getPost = async (id: string) => {
    return getPosts();
};

/**
 * Get all posts by current user dashboard
 */
export const getAllUserPosts = async () => {
    try {
        const response = await localApi.get('/posts/user');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user posts');
    }
};

/**
 * Get single post by ID
 */
export const getSinglePost = async (postId: string) => {
    try {
        // Add timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        const response = await localApi.get(`/posts/${postId}`, {
            params: { _t: timestamp },
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        const data = extractResponseData(response);
        // Server returns { post, breadcrumbs }, extract just the post
        return (data as any).post || data;
    } catch (error) {
        throw handleApiError(error, 'fetching post');
    }
};

/**
 * Create a new post
 */
export const addPost = async (postData: FormData) => {
    try {
        const response = await localApi.post('/posts', formDataToObject(postData));
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'creating post');
    }
};

/**
 * Update an existing post
 */
export const updatePost = async (postData: FormData, postId: string) => {
    try {
        const response = await localApi.patch(`/posts/${postId}`, formDataToObject(postData));
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating post');
    }
};

/**
 * Delete a post
 */
export const deletePost = async (postId: string) => {
    try {
        const response = await localApi.delete(`/posts/${postId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting post');
    }
};

/**
 * Server-side post fetching (for SSR/SSG)
 */
export const getPostsServer = async () => {
    try {
        const response = await localApi.get('/posts');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching posts (server)');
    }
};

export const getSinglePostServer = async (postId: string) => {
    try {
        const response = await localApi.get(`/posts/${postId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching post (server)');
    }
};
