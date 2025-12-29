import { api, serverApi, handleApiError, extractResponseData } from './apiClient';



/**
 * Get all posts public 
 */
export const getPosts = async () => {
    try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await api.get(`/posts?_t=${timestamp}`);

        console.log('post detail', response)
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
        const response = await api.get('/posts/user');
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
        const response = await api.get(`/posts/${postId}`, {
            params: { _t: timestamp },
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        const data = extractResponseData(response);
        // Server returns { post, breadcrumbs }, extract just the post
        return data.post || data;
    } catch (error) {
        throw handleApiError(error, 'fetching post');
    }
};

/**
 * Create a new post
 * Uses multipart/form-data for file uploads
 */
export const addPost = async (postData: FormData) => {
    try {
        const response = await api.post('/posts', postData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'creating post');
    }
};

/**
 * Update an existing post
 * Uses multipart/form-data for file uploads
 */
export const updatePost = async (postData: FormData, postId: string) => {
    try {
        const response = await api.patch(`/posts/${postId}`, postData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
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
        const response = await api.delete(`/posts/${postId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting post');
    }
};

/**
 * Like a post
 */
export const likePost = async (postId: string, userId: string) => {
    try {
        const response = await api.patch(`/posts/like/${postId}`, { userId });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'liking post');
    }
};

/**
 * Track post view
 */
export const viewPost = async (postId: string) => {
    try {
        const response = await api.patch(`/posts/view/${postId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'tracking post view');
    }
};

/**
 * Server-side post fetching (for SSR/SSG)
 */
export const getPostsServer = async () => {
    try {
        const response = await serverApi.get('/posts');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching posts (server)');
    }
};

export const getSinglePostServer = async (postId: string) => {
    try {
        const response = await serverApi.get(`/posts/${postId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching post (server)');
    }
};
