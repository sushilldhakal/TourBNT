/**
 * User type – single source for API and UI.
 * Canonical shape matching API responses; use in types.ts (Reply, Review, Post, Comment) and components.
 */
export interface User {
    id: string;
    /** Only a few legacy endpoints still send it; use `id`. */
    _id?: string;
    name: string;
    email: string;
    profilePicture?: string;
    avatar?: string;
    roles: Array<'admin' | 'user' | 'seller'>;
    isSeller?: boolean;
    sellerInfo?: Record<string, unknown>;
}
