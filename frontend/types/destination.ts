// Global Destination (backend manages approval)
export interface GlobalDestination {
    _id: string;
    name: string;
    description: string;
    coverImage?: string;
    country: string;
    region?: string;
    city?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
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
        timezone?: string;
        currency?: string;
        language?: string[];
        climate?: string;
        bestTimeToVisit?: string[];
        attractions?: string[];
    };
    createdAt: string;
    updatedAt: string;
}

// User Destination (user-specific relationship)
export interface UserDestination {
    _id: string;
    user: string;
    destination: GlobalDestination; // Populated global destination
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

/** Form data for Add Destination (dashboard) */
export interface DestinationFormData {
    name: string;
    coverImage: string;
    description: string;
    reason: string;
    isActive: boolean;
    country: string;
    region: string;
    city: string;
    popularity: number;
    featuredTours: string[];
}

// For creating destinations
export interface CreateDestinationDTO {
    name: string;
    description: string;
    country: string;
    region?: string;
    city?: string;
    coverImage?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    metadata?: any;
}

// For updating destinations
export interface UpdateDestinationDTO {
    name?: string;
    description?: string;
    country?: string;
    region?: string;
    city?: string;
    coverImage?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    metadata?: any;
}

// For updating user destination settings
export interface UserDestinationSettings {
    isActive?: boolean;
    isFavorite?: boolean;
    customName?: string;
    sortOrder?: number;
}