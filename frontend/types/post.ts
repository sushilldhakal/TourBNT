/** Comment shape for posts/dashboard (API response with id/_id, nested user, replies) */
export interface PostComment {
    id?: string;
    _id?: string;
    post: string;
    user: {
        id?: string;
        _id?: string;
        name: string;
        email: string;
        avatar?: string;
    } | null;
    text: string;
    approve: boolean;
    likes?: number;
    views?: number;
    timestamp?: string;
    replies?: PostComment[];
    createdAt: string;
    isLiked?: boolean;
    depth?: number;
    canReply?: boolean;
}

export interface PostListAuthor {
    name?: string;
    email?: string;
    roles?: string[];
};

export interface PostListItem {
    id: string;
    title: string;
    image?: string;
    author?: PostListAuthor | PostListAuthor[];
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    views?: number;
    commentsCount?: number;
};

export interface PostsListResponse {
    /** Standard API list key (prefer over items) */
    data?: PostListItem[];
    /** @deprecated Use data. Kept for backward compatibility. */
    items?: PostListItem[];
    pagination?: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
    message?: string;
}