import { api, handleApiError, extractResponseData } from './apiClient';

/** Roles the day dialog edits. */
export type DayRole = 'accommodation' | 'meals' | 'transport' | 'guide';

export interface DaySupplier {
    role: string;
    name: string;
    businessPartnerId: string | null;
    openForAll: boolean;
    unitsRequested: number | null;
    unitType: string | null;
    /** Upcoming pending/held/countered requests for this supplier on this day. */
    liveRequests: number;
    /** Upcoming confirmed requests — the supplier must withdraw before they can be replaced. */
    confirmedRequests: number;
}

export interface DayDetail {
    tourId: string;
    tourTitle: string;
    dayId: string | null;
    dayKey: string;
    dayNumber: number;
    title: string;
    place: string;
    destinationId: string | null;
    destinationName: string | null;
    /** `day` saved on the day; `text` guessed from its place name; `tour` the tour's own destination. */
    destinationSource: 'day' | 'text' | 'tour' | null;
    partners: DaySupplier[];
    /** Requests this departure's date lost. Only filled when the dialog passes the date. */
    closedRequests: ClosedRequest[];
}

export interface ClosedRequest {
    requestId: string;
    role: string;
    status: 'declined' | 'expired';
    businessPartnerId: string;
    partnerName: string;
}

export interface SupplierOption {
    id: string;
    name: string;
    type: string;
    rating: number;
    destinationIds: string[];
}

export type SupplierOptions = Record<DayRole, SupplierOption[]>;

export interface DaySupplierInput {
    role: DayRole;
    businessPartnerId: string | null;
    name?: string;
    openForAll?: boolean;
}

/** Stable key the API uses to find a day: its id when it has one, else its position. */
export const dayKeyOf = (day: { dayId?: string; index: number }): string => day.dayId ?? `idx:${day.index}`;

export const getDayDetail = async (tourId: string, dayKey: string, date?: string) => {
    try {
        const response = await api.get(`/operations/tours/${tourId}/days/${encodeURIComponent(dayKey)}`, { params: date ? { date } : {} });
        return extractResponseData<DayDetail>(response);
    } catch (error) {
        throw handleApiError(error, 'loading this itinerary day');
    }
};

export const getSupplierOptions = async (destinationId: string | null) => {
    try {
        const response = await api.get('/operations/supplier-options', { params: destinationId ? { destinationId } : {} });
        return extractResponseData<{ destinationId: string | null; options: SupplierOptions }>(response).options;
    } catch (error) {
        throw handleApiError(error, 'loading suppliers');
    }
};

export const updateDay = async (
    tourId: string,
    dayKey: string,
    body: { destinationId: string | null; place?: string; partners: DaySupplierInput[] },
) => {
    try {
        const response = await api.patch(`/operations/tours/${tourId}/days/${encodeURIComponent(dayKey)}`, body);
        return extractResponseData<DayDetail>(response);
    } catch (error) {
        throw handleApiError(error, 'saving this itinerary day');
    }
};

export const reassignRequest = async (requestId: string, businessPartnerId: string) => {
    try {
        const response = await api.post(`/operations/requests/${requestId}/reassign`, { businessPartnerId });
        return extractResponseData<{ requestId: string; businessPartnerId: string }>(response);
    } catch (error) {
        throw handleApiError(error, 'sending the request to another business');
    }
};
