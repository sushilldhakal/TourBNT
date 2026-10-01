import { api, handleApiError } from './apiClient';
import type { BusinessPartner, BusinessPartnerType } from './businessPartners';
import type { DashboardUser } from '@/types/app';

/**
 * Server-paginated admin list endpoints (users, applications, operations).
 * All of them respond with `{ success, items, pagination, counts? }`.
 */
export interface PageInfo {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
}

export interface PagedResult<T, C = Record<string, number>> {
    items: T[];
    pagination: PageInfo;
    counts?: C;
}

const normalize = <T, C = Record<string, number>>(body: any): PagedResult<T, C> => ({
    items: body?.items ?? [],
    pagination: body?.pagination ?? { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
    counts: body?.counts,
});

const clean = (params: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'));

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const getUsersPage = async (params: { role?: string; q?: string; page: number; limit: number }) => {
    try {
        const { role, ...rest } = params;
        const response = await api.get('/users', { params: clean({ ...rest, roles: role }) });
        return normalize<DashboardUser & { role?: string; verified?: boolean }>(response.data);
    } catch (error) {
        throw handleApiError(error, 'fetching users');
    }
};

export const getUserRoleCounts = async () => {
    try {
        const response = await api.get('/users/role-counts');
        return response.data.data as { counts: Record<string, number>; total: number };
    } catch (error) {
        throw handleApiError(error, 'fetching user counts');
    }
};

// ---------------------------------------------------------------------------
// Applications (sellers + business partners)
// ---------------------------------------------------------------------------
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface SellerApplication {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    roles: string;
    sellerApplicationStatus: ApplicationStatus;
    rejectionReason?: string;
    createdAt: string;
    sellerInfo?: {
        companyName?: string;
        companyRegistrationNumber?: string;
        companyType?: string;
        taxId?: string;
        website?: string;
        sellerType?: string;
        businessDescription?: string;
        businessAddress?: { address?: string; city?: string; state?: string; country?: string };
        appliedAt?: string;
        approvedAt?: string;
        contactPerson?: string;
        documents?: Array<{ type?: string; url?: string }>;
    };
}

export const getSellerApplicationsPage = async (params: { status: ApplicationStatus; q?: string; page: number; limit: number }) => {
    try {
        const response = await api.get('/users/seller-applications', { params: clean(params) });
        return normalize<SellerApplication, Record<ApplicationStatus, number>>(response.data);
    } catch (error) {
        throw handleApiError(error, 'fetching seller applications');
    }
};

export const getBusinessApplicationsPage = async (params: { type: BusinessPartnerType; status: ApplicationStatus; q?: string; page: number; limit: number }) => {
    try {
        const response = await api.get('/business-partners/pending', { params: clean(params) });
        return normalize<BusinessPartner>(response.data);
    } catch (error) {
        throw handleApiError(error, 'fetching business applications');
    }
};

export const getBusinessApplicationCounts = async () => {
    try {
        const response = await api.get('/business-partners/application-counts');
        return response.data.data.byType as Record<string, Record<ApplicationStatus, number>>;
    } catch (error) {
        throw handleApiError(error, 'fetching application counts');
    }
};

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------
export interface OperationsRequestRow {
    id: string;
    tourId: string;
    tourTitle: string;
    tourCode: string;
    partnerId: string;
    partnerName: string;
    partnerType: string;
    role: string;
    serviceDate: string;
    serviceTime: string | null;
    headcount: number;
    unitsRequested: number;
    unitType: string | null;
    status: 'pending' | 'held' | 'confirmed' | 'countered' | 'declined' | 'expired';
    capacityConfirmed: number | null;
    responseNotes: string | null;
    counterUnits: number | null;
    counterDate: string | null;
    counterNotes: string | null;
    holdExpiresAt: string | null;
    respondByAt: string | null;
    updatedAt: string;
}

export interface OperationsTripRow {
    tourId: string;
    title: string;
    code: string;
    coverImage: string | null;
    destination: string | null;
    departure: string;
    bookings: number;
    pax: number;
    revenue: number;
    confirmedBookings: number;
    requestsTotal: number;
    requestsConfirmed: number;
    requestsProblem: number;
}

export interface OperationsSupplierRow {
    id: string;
    name: string;
    type: string;
    city: string | null;
    averageRating: number;
    isActive: boolean;
    phone: string | null;
    email: string | null;
    totalUnits: number;
    unitLabel: string;
    openRequests: number;
    confirmedRequests: number;
    problemRequests: number;
}

export const getOperationsRequestsPage = async (params: { status?: string; role?: string; q?: string; page: number; limit: number }) => {
    try {
        const response = await api.get('/operations/requests', { params: clean(params) });
        return normalize<OperationsRequestRow>(response.data);
    } catch (error) {
        throw handleApiError(error, 'fetching supplier requests');
    }
};

export const getOperationsTripsPage = async (params: { q?: string; page: number; limit: number }) => {
    try {
        const response = await api.get('/operations/trips', { params: clean(params) });
        return normalize<OperationsTripRow>(response.data);
    } catch (error) {
        throw handleApiError(error, 'fetching upcoming trips');
    }
};

export const getOperationsSuppliersPage = async (params: { type?: string; q?: string; page: number; limit: number }) => {
    try {
        const response = await api.get('/operations/suppliers', { params: clean(params) });
        return normalize<OperationsSupplierRow>(response.data);
    } catch (error) {
        throw handleApiError(error, 'fetching suppliers');
    }
};

// ---------------------------------------------------------------------------
// Tour bookings & reviews (seller sees their own tours, admin sees all)
// ---------------------------------------------------------------------------
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export interface ManagedBooking {
    id: string;
    bookingReference: string;
    tourId: string;
    tourTitle: string;
    tourCode: string;
    isGuestBooking: boolean;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    departureDate: string;
    bookingDate: string;
    participants: { adults: number; children: number; infants: number };
    pricing: { totalPrice: number; currency: string; amountDueNow: number; amountDueLater: number };
    paymentType: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    paidAmount: number;
    specialRequests?: string | null;
    cancellationReason?: string | null;
    tour?: { id: string; title: string; code: string; coverImage?: string | null } | null;
}

export const getBookingsPage = async (params: { status?: string; paymentStatus?: string; q?: string; page: number; limit: number }) => {
    try {
        const response = await api.get('/bookings', { params: clean(params) });
        return normalize<ManagedBooking>(response.data);
    } catch (error) {
        throw handleApiError(error, 'fetching bookings');
    }
};

export interface BookingStatRow { _id: BookingStatus; count: number; totalRevenue: number; paidRevenue: number }

export interface ManagedReview {
    id: string;
    tourId: string;
    tourTitle?: string;
    tourCode?: string;
    rating: number;
    comment: string;
    status: 'pending' | 'approved' | 'rejected';
    likes: number;
    createdAt: string;
    user?: { id: string; name: string; email: string; avatar?: string | null } | null;
    replies: Array<{ id: string; comment: string; createdAt: string; user?: { id: string; name: string; roles?: string } | null }>;
}

export const getManagedReviewsPage = async (params: { status?: string; q?: string; page: number; limit: number }) => {
    try {
        const response = await api.get('/reviews/manage', { params: clean(params) });
        return normalize<ManagedReview, Record<'pending' | 'approved' | 'rejected', number>>(response.data);
    } catch (error) {
        throw handleApiError(error, 'fetching reviews');
    }
};

// ---------------------------------------------------------------------------
// Role-aware dashboard home summary (GET /dashboard/summary)
// ---------------------------------------------------------------------------
export interface BookingBrief {
    id: string;
    reference: string;
    tourTitle: string;
    contactName: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    departureDate: string;
    total: number;
}

export interface PartnerSummary {
    id: string;
    name: string;
    type: 'guide' | 'hotel' | 'guesthouse' | 'restaurant' | 'transport' | 'advertiser';
    approvalStatus: ApplicationStatus;
    rejectionReason: string | null;
    isActive: boolean;
    averageRating: number;
    reviewCount: number;
    views: number;
    logo: string | null;
    requests: { pending: number; held: number; countered: number; confirmed: number; declined: number; expired: number; upcomingConfirmed: number };
    inventory: { totalUnits: number; types: number; unitLabel: string };
    nextRequests: Array<{ id: string; tourTitle: string; role: string; serviceDate: string; serviceTime: string | null; unitsRequested: number; status: string; respondByAt: string | null; holdExpiresAt: string | null }>;
    pendingReviews: number;
    ads: { total: number; active: number; pending: number; impressions: number; clicks: number; ctr: number };
}

export interface AdminHomeSummary {
    kind: 'admin';
    users: { total: number; sellers: number; customers: number; partners: number };
    pendingApplications: { sellers: number; partners: number; total: number };
    tours: { total: number; published: number; draft: number };
    bookings: { total: number; pending: number; confirmed: number; upcoming: number; revenue: number; collected: number };
    pendingReviews: number;
    ads: { pending: number; active: number };
    supplierRequests: { open: number; problems: number };
    subscribers: number;
    recentBookings: BookingBrief[];
    latestApplications: Array<{ id: string; name: string; type: string; submittedAt: string }>;
}

export interface SellerHomeSummary {
    kind: 'seller';
    tours: { total: number; published: number; draft: number; archived: number; views: number };
    bookings: { total: number; pending: number; confirmed: number; upcoming: number; revenue: number; collected: number };
    reviews: { pending: number; approved: number; average: number };
    openEnquiries: number;
    upcomingDepartures: Array<{ tourId: string; title: string; departure: string; bookings: number; pax: number }>;
    recentBookings: BookingBrief[];
    partners: PartnerSummary[];
}

export interface PartnerHomeSummary {
    kind: 'partner';
    partners: PartnerSummary[];
}

export type DashboardHomeSummary = AdminHomeSummary | SellerHomeSummary | PartnerHomeSummary;

export const getDashboardSummary = async () => {
    try {
        const response = await api.get('/dashboard/summary');
        return response.data.data as DashboardHomeSummary;
    } catch (error) {
        throw handleApiError(error, 'fetching dashboard summary');
    }
};
