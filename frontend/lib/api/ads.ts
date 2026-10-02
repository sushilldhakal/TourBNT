import { api, handleApiError, extractResponseData } from './apiClient';

export type AdPlacementSlot = 'tour_detail' | 'tour_sidebar' | 'hotel_page' | 'search_results' | 'homepage';
export type AdCampaignStatus = 'draft' | 'active' | 'paused' | 'ended';
export type AdBillingModel = 'monthly' | 'per_view';

export interface AdTargets {
    categories: { id: string; name: string }[];
    destinations: { id: string; name: string }[];
}

export interface AdPricing {
    monthlyPrice: number;
    pricePer100Views: number;
    currency: string;
    updatedAt?: string | null;
}

export interface AdStats {
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
    billingModel: AdBillingModel;
    viewQuota: number | null;
    viewsRemaining: number | null;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
    priceAmount: number;
    currency: string;
    isPaid: boolean;
    daily: Array<{ date: string; impressions: number; clicks: number }>;
}

/** Mirrors the server's pricing rule (adPricing.ts) so the form can show the price up front. */
export function quoteAd(pricing: AdPricing, billingModel: AdBillingModel, durationMonths: number, viewQuota: number): number {
    return billingModel === 'monthly'
        ? durationMonths * pricing.monthlyPrice
        : (Math.ceil(Math.max(viewQuota, 0) / 100)) * pricing.pricePer100Views;
}

export function formatPrice(amount: number, currency = 'NPR'): string {
    return `${currency === 'NPR' ? 'Rs' : currency} ${amount.toLocaleString('en-IN')}`;
}

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
    isPaid: boolean;
    paidAt?: string | null;
    billingModel: AdBillingModel;
    durationMonths: number;
    viewQuota?: number | null;
    priceAmount: number;
    currency: string;
    business?: { id: string; name: string; slug?: string; type?: string; destinationId?: string | null };
    targets?: AdTargets;
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

export type AdminAdFilter = 'all' | 'pending' | 'unpaid' | 'active' | 'ended' | 'rejected';

export const getAdminAds = async (status: AdminAdFilter = 'all', page = 1, limit = 20) => {
    try {
        const response = await api.get('/ads/admin', { params: { status, page, limit } });
        // sendPaginatedResponse puts the rows under `items`; expose them as `data` for callers.
        const body = response.data as { success: boolean; items?: Advertisement[]; data?: Advertisement[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } };
        return { success: body.success, data: body.items ?? body.data ?? [], pagination: body.pagination };
    } catch (error) {
        throw handleApiError(error, 'fetching ad campaigns');
    }
};

export const getPendingAds = async (page = 1, limit = 10) => getAdminAds('pending', page, limit);

export const markAdPaid = async (adId: string) => {
    try {
        const response = await api.patch(`/ads/${adId}/mark-paid`);
        return extractResponseData<Advertisement>(response);
    } catch (error) {
        throw handleApiError(error, 'recording payment');
    }
};

export const getAdPricing = async () => {
    try {
        const response = await api.get('/ads/pricing');
        return extractResponseData<AdPricing>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching ad pricing');
    }
};

export const updateAdPricing = async (pricing: { monthlyPrice: number; pricePer100Views: number }) => {
    try {
        const response = await api.put('/ads/pricing', pricing);
        return extractResponseData<AdPricing>(response);
    } catch (error) {
        throw handleApiError(error, 'updating ad pricing');
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

export const getAdStats = async (adId: string, days = 30) => {
    try {
        const response = await api.get(`/ads/${adId}/stats`, { params: { days } });
        return extractResponseData<AdStats>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching ad stats');
    }
};

/** What a page is about, so the server returns only ads connected to it. */
export interface AdContextParams {
    tourId?: string;
    destinationIds?: string[];
    categoryIds?: string[];
    /** A search phrase, matched against destination/category names. */
    q?: string;
}

/** The public ad-serving call — used by <RelevantAdSlot>. */
export const getAdsForPlacement = async (params: { placementSlot: AdPlacementSlot; limit?: number } & AdContextParams) => {
    try {
        const response = await api.get('/ads/placements', {
            params: {
                placementSlot: params.placementSlot,
                limit: params.limit,
                tourId: params.tourId || undefined,
                destinationIds: params.destinationIds?.length ? params.destinationIds.join(',') : undefined,
                categoryIds: params.categoryIds?.length ? params.categoryIds.join(',') : undefined,
                q: params.q?.trim() || undefined,
            },
        });
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

/** Counts ads that were actually seen on screen. Best-effort. */
export const recordAdImpressions = async (adIds: string[]) => {
    try {
        await api.post('/ads/impressions', { adIds });
    } catch {
        // Never let tracking break the page.
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

export interface AdPlacementPreview {
    serving: boolean;
    blockers: string[];
    places: { id: string; name: string; source: 'business location' | 'business listing' | 'ad targeting' }[];
    tourTypes: { id: string; name: string }[];
    tours: { id: string; title: string }[];
    tourCount: number;
    surfaces: string[];
}

/** Where an ad appears right now, or why it doesn't. Owner or admin. */
export const getAdPlacementPreview = async (adId: string) => {
    try {
        const response = await api.get(`/ads/${adId}/where`);
        return extractResponseData<AdPlacementPreview>(response);
    } catch (error) {
        throw handleApiError(error, 'checking where the ad shows');
    }
};
