import { api, handleApiError, extractResponseData } from './apiClient';

export type AdPlacementSlot = 'tour_detail' | 'tour_sidebar' | 'hotel_page' | 'search_results' | 'homepage';
export type AdCampaignStatus = 'draft' | 'active' | 'paused' | 'ended';

export interface Advertisement {
    id: string;
    businessPartnerId: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    ctaLabel?: string | null;
    ctaUrl: string;
    placementSlot: AdPlacementSlot;
    campaignStatus: AdCampaignStatus;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    impressionCount: number;
    clickCount: number;
    business?: { id: string; name: string; slug?: string; type?: string };
    createdAt: string;
    updatedAt: string;
}

export const createAdCampaign = async (formData: FormData) => {
    try {
        const response = await api.post('/ads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return extractResponseData<Advertisement>(response);
    } catch (error) {
        throw handleApiError(error, 'creating ad campaign');
    }
};

export const updateAdCampaign = async (adId: string, formData: FormData) => {
    try {
        const response = await api.patch(`/ads/${adId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return extractResponseData<Advertisement>(response);
    } catch (error) {
        throw handleApiError(error, 'updating ad campaign');
    }
};

export const getMyAdCampaigns = async () => {
    try {
        const response = await api.get('/ads/me');
        // Same array-unwrapping issue as getAdsForPlacement above.
        const raw = response.data as { data?: Advertisement[] } | Advertisement[];
        return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    } catch (error) {
        throw handleApiError(error, 'fetching your ad campaigns');
    }
};

export const updateAdTargeting = async (adId: string, categoryIds: string[], destinationIds: string[]) => {
    try {
        const response = await api.patch(`/ads/${adId}/targeting`, { categoryIds, destinationIds });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating ad targeting');
    }
};

export const getPendingAds = async (page = 1, limit = 10) => {
    try {
        const response = await api.get('/ads/pending', { params: { page, limit } });
        return response.data as { success: boolean; data: Advertisement[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } };
    } catch (error) {
        throw handleApiError(error, 'fetching pending ads');
    }
};

export const approveAd = async (adId: string) => {
    try {
        const response = await api.patch(`/ads/${adId}/approve`);
        return extractResponseData<Advertisement>(response);
    } catch (error) {
        throw handleApiError(error, 'approving ad');
    }
};

export const rejectAd = async (adId: string, reason: string) => {
    try {
        const response = await api.patch(`/ads/${adId}/reject`, { reason });
        return extractResponseData<Advertisement>(response);
    } catch (error) {
        throw handleApiError(error, 'rejecting ad');
    }
};

export const deleteAdCampaign = async (adId: string) => {
    try {
        await api.delete(`/ads/${adId}`);
    } catch (error) {
        throw handleApiError(error, 'deleting ad campaign');
    }
};

export const getAdStats = async (adId: string) => {
    try {
        const response = await api.get(`/ads/${adId}/stats`);
        return extractResponseData<{ totalImpressions: number; totalClicks: number; daily: Array<{ date: string; impressions: number; clicks: number }> }>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching ad stats');
    }
};

/** The public ad-serving call — used by <RelevantAdSlot>. */
export const getAdsForPlacement = async (params: { placementSlot: AdPlacementSlot; categoryId?: string; destinationId?: string; limit?: number }) => {
    try {
        const response = await api.get('/ads/placements', { params });
        // extractResponseData only unwraps `data.data` when it isn't itself
        // an array (see its `!Array.isArray` guard), so a plain array
        // payload like this one comes back as the raw {success,message,data}
        // envelope instead of the array — unwrap it explicitly here.
        const raw = response.data as { data?: Advertisement[] } | Advertisement[];
        return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    } catch (error) {
        throw handleApiError(error, 'fetching ads');
    }
};

export const recordAdClick = async (adId: string) => {
    try {
        const response = await api.post(`/ads/${adId}/click`);
        return extractResponseData<{ ctaUrl: string }>(response);
    } catch {
        // Click tracking is best-effort — never block navigation on failure.
        return null;
    }
};
