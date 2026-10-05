import { Post } from '../../types/types';
import { api, serverApi, handleApiError, extractResponseData } from './apiClient';



/**
 * Get all posts public
 */
export const getPosts =  async ({
    page = 1,
    limit = 10,
    tag,
}: {
    page?: number;
    limit?: number;
    /** Only posts with this tag. */
    tag?: string;
} = {}) => {
    try {
        const response = await api.get('/posts', {
            params: {
                page,
                limit,
                ...(tag ? { tag } : {}),
            }
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching posts');
    }
};

/**
 * Get all posts by current user dashboard
 * Supports pagination with optional parameters
 */
export const getAllUserPosts = async ({
    page = 1,
    limit = 10
}: {
    page?: number;
    limit?: number;
} = {}) => {
    try {
        const response = await api.get('/posts/user', {
            params: {
                page,
                limit
            }
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user posts');
    }
};

/**
 * Get single post by ID
 */
export const getSinglePost = async (postId: string) => {
    if (!postId || postId === 'undefined') {
        throw new Error('Post ID is required');
    }
    try {
        // Add timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        const response = await api.get(`/posts/${postId}`, {
            params: { _t: timestamp },
        });
        const data = extractResponseData(response);
        // Server returns { post, breadcrumbs }, extract just the post
        return (data as { post: Post }).post || data;
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
        return extractResponseData<Post>(response);
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
    if (!postId || postId === 'undefined') {
        throw new Error('Post ID is required');
    }
    try {
        const response = await serverApi.get(`/posts/${postId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching post (server)');
    }
};

export interface RelatedPost {
    id: string;
    title: string;
    image: string | null;
    tags: string[] | null;
    createdAt: string;
    author: { id: string; name: string } | null;
    sharedTags: number;
}

/**
 * Other published posts, those sharing the most tags with this one first, topped up with the newest.
 */
export const getRelatedPosts = async (postId: string, limit = 3): Promise<RelatedPost[]> => {
    try {
        const response = await api.get(`/posts/${postId}/related`, { params: { limit } });
        // extractResponseData only unwraps single objects, so take the list out of the envelope here.
        const list = response.data?.data;
        return Array.isArray(list) ? list : [];
    } catch (error) {
        throw handleApiError(error, 'fetching related posts');
    }
};
