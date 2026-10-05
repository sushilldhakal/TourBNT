import { api, handleApiError, extractResponseData } from './apiClient';

export type EpgStatusFilter =
    | 'all'
    | 'running'
    | 'upcoming'
    | 'starting-today'
    | 'ending-today'
    | 'completed'
    | 'cancelled'
    | 'delayed'
    | 'attention';

export type EpgOperationalStatus = 'upcoming' | 'running' | 'completed' | 'cancelled' | 'delayed' | 'attention';
export type TransportKind = 'flight' | 'road' | 'trek' | 'boat' | 'safari';

export interface EpgDay {
    index: number;
    dayNumber: number;
    date: string;
    dayId?: string;
    title: string;
    destination: string;
    accommodation: string | null;
    guide: string | null;
    transport: string | null;
    vehicle: string | null;
    activity: string | null;
    transportKind: TransportKind | null;
}

export interface EpgDeparture {
    id: string;
    tourId: string;
    title: string;
    code: string;
    departureLabel: string;
    destination: string | null;
    startDate: string;
    endDate: string;
    totalDays: number;
    guestCount: number;
    bookingCount: number;
    capacity: number | null;
    status: EpgOperationalStatus;
    needsAttention: boolean;
    delayed: boolean;
    cancelled: boolean;
    currentDay: number | null;
    guideName: string | null;
    todayStop: EpgDay | null;
    nextStop: EpgDay | null;
    issues: string[];
    days: EpgDay[];
}

export interface EpgTimeline {
    from: string;
    to: string;
    today: string;
    dates: string[];
    truncated: boolean;
    totalMatched: number;
    counts: Record<EpgStatusFilter, number>;
    facets: {
        destinations: string[];
        guides: string[];
        transports: string[];
    };
    departures: EpgDeparture[];
}

export interface EpgParams {
    from: string;
    to: string;
    today: string;
    status?: EpgStatusFilter;
    q?: string;
    destination?: string;
    guide?: string;
    transport?: string;
}

export const getOperationsEpg = async (params: EpgParams) => {
    try {
        const response = await api.get('/operations/epg', {
            params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== 'all')),
        });
        return extractResponseData<EpgTimeline>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching the tour timeline');
    }
};
