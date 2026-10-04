// Global Category (backend manages approval)
export interface GlobalCategory {
    _id: string;
    name: string;
    description: string;
    imageUrl?: string;
    slug: string;
    reason?: string;
    // GLOBAL STATE ONLY
    isApproved: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    createdBy: string;
    approvedBy?: string;
    rejectedBy?: string;
    rejectionReason?: string;
    approvedAt?: string;
    rejectedAt?: string;
    submittedAt: string;
    popularity: number;
    usageCount: number;
    sellerCount: number;
    metadata?: {
        keywords?: string[];
        parentCategory?: string;
        subcategories?: string[];
    };
    createdAt: string;
    updatedAt: string;
}

// User Category (user-specific relationship)
export interface UserCategory {
    _id: string;
    user: string;
    category: GlobalCategory; // Populated global category
    // USER-SPECIFIC STATE
    isActive: boolean;
    isFavorite: boolean;
    customName?: string;
    sortOrder: number;
    addedAt: string;
    lastUsed?: string;
    createdAt: string;
    updatedAt: string;
}

/** Form data for Add Category (dashboard) */
export interface CategoryFormData {
    name: string;
    imageUrl: string;
    description: string;
    reason: string;
}

import type { CategoryData } from './types';

/** Props for CategoryGridView component */
export interface CategoryGridViewProps {
    categories: CategoryData[];
    isLoading?: boolean;
    onRefresh?: () => void;
}

/** Props for CategoryTableView component */
export interface CategoryTableViewProps {
    categories: CategoryData[];
    isLoading?: boolean;
    onRefresh?: () => void;
}

// For creating categories
export interface CreateCategoryDTO {
    name: string;
    description: string;
    imageUrl?: string;
    parentCategory?: string;
    reason?: string;
}

// For updating categories
export interface UpdateCategoryDTO {
    name?: string;
    description?: string;
    imageUrl?: string;
    metadata?: Record<string, unknown>;
}

// For updating user category settings
export interface UserCategorySettings {
    isActive?: boolean;
    isFavorite?: boolean;
    customName?: string;
    sortOrder?: number;
}