import { api, handleApiError, extractResponseData } from './apiClient';

export type BusinessPartnerType = 'guide' | 'hotel' | 'guesthouse' | 'restaurant' | 'transport' | 'advertiser';

export interface BusinessPartner {
    id: string;
    ownerId: string;
    type: BusinessPartnerType;
    name: string;
    slug: string;
    description?: string | null;
    logo?: string | null;
    coverImage?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: { address?: string; city?: string; state?: string; postalCode?: string; country?: string } | null;
    destinationId?: string | null;
    details?: Record<string, unknown> | null;
    isApproved: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string | null;
    isActive: boolean;
    averageRating: number;
    reviewCount: number;
    approvedReviewCount: number;
    views: number;
    documents?: Array<{ id: string; docType: string; url: string; originalFilename?: string }>;
    createdAt: string;
    updatedAt: string;
}

/** Submit a new business-partner application (multipart, supports document uploads). */
export const applyAsBusinessPartner = async (formData: FormData) => {
    try {
        const response = await api.post('/business-partners', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return extractResponseData<BusinessPartner>(response);
    } catch (error) {
        throw handleApiError(error, 'submitting business application');
    }
};

export const getMyBusinessPartners = async () => {
    try {
        const response = await api.get('/business-partners/me');
        return extractResponseData<BusinessPartner[]>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching your businesses');
    }
};

export const getBusinessPartnerById = async (businessPartnerId: string) => {
    try {
        const response = await api.get(`/business-partners/${businessPartnerId}`);
        return extractResponseData<BusinessPartner>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching business');
    }
};

export const getBusinessPartnerBySlug = async (slug: string) => {
    try {
        const response = await api.get(`/business-partners/slug/${slug}`);
        return extractResponseData<BusinessPartner>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching business');
    }
};

export const searchBusinessPartners = async (params: { type?: BusinessPartnerType; destinationId?: string; q?: string; categoryId?: string; page?: number; limit?: number }) => {
    try {
        const response = await api.get('/business-partners', { params });
        return response.data as { success: boolean; data: BusinessPartner[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } };
    } catch (error) {
        throw handleApiError(error, 'searching businesses');
    }
};

export const updateMyBusinessPartner = async (businessPartnerId: string, formData: FormData) => {
    try {
        const response = await api.patch(`/business-partners/${businessPartnerId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return extractResponseData<BusinessPartner>(response);
    } catch (error) {
        throw handleApiError(error, 'updating business');
    }
};

export const updateBusinessPartnerTargeting = async (businessPartnerId: string, categoryIds: string[], destinationIds: string[]) => {
    try {
        const response = await api.patch(`/business-partners/${businessPartnerId}/targeting`, { categoryIds, destinationIds });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating targeting preferences');
    }
};

export const getPendingBusinessPartners = async (page = 1, limit = 10) => {
    try {
        const response = await api.get('/business-partners/pending', { params: { page, limit } });
        return response.data as { success: boolean; data: BusinessPartner[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } };
    } catch (error) {
        throw handleApiError(error, 'fetching pending businesses');
    }
};

export const approveBusinessPartner = async (businessPartnerId: string) => {
    try {
        const response = await api.patch(`/business-partners/${businessPartnerId}/approve`);
        return extractResponseData<BusinessPartner>(response);
    } catch (error) {
        throw handleApiError(error, 'approving business');
    }
};

export const rejectBusinessPartner = async (businessPartnerId: string, reason: string) => {
    try {
        const response = await api.patch(`/business-partners/${businessPartnerId}/reject`, { reason });
        return extractResponseData<BusinessPartner>(response);
    } catch (error) {
        throw handleApiError(error, 'rejecting business');
    }
};

export const deleteBusinessPartner = async (businessPartnerId: string) => {
    try {
        await api.delete(`/business-partners/${businessPartnerId}`);
    } catch (error) {
        throw handleApiError(error, 'deleting business');
    }
};

// Business reviews (nested + top-level, mirrors lib/api/reviews.ts)
export const getBusinessReviews = async (businessPartnerId: string, status?: string) => {
    try {
        const url = status ? `/business-partners/${businessPartnerId}/reviews?status=${status}` : `/business-partners/${businessPartnerId}/reviews`;
        const response = await api.get(url);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching business reviews');
    }
};

export const addBusinessReview = async (businessPartnerId: string, rating: number, comment: string) => {
    try {
        const response = await api.post(`/business-partners/${businessPartnerId}/reviews`, { rating, comment });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'submitting business review');
    }
};

export const getPendingBusinessReviews = async () => {
    try {
        const response = await api.get('/business-reviews/pending');
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching pending business reviews');
    }
};

export const updateBusinessReviewStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
        const response = await api.patch(`/business-reviews/${reviewId}/status`, { status });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating business review status');
    }
};

export const addBusinessReviewReply = async (reviewId: string, comment: string) => {
    try {
        const response = await api.post(`/business-reviews/${reviewId}/replies`, { comment });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'replying to business review');
    }
};

export const getToursFeaturingBusinessPartner = async (businessPartnerId: string) => {
    try {
        const response = await api.get(`/business-partners/${businessPartnerId}/tours`);
        return extractResponseData<Array<{ id: string; title: string; code: string; coverImage?: string; price?: number; averageRating: number }>>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching tours featuring this business');
    }
};

export const toggleBusinessReviewLike = async (reviewId: string) => {
    try {
        const response = await api.post(`/business-reviews/${reviewId}/likes`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'liking business review');
    }
};
