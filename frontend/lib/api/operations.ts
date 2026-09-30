import { api, handleApiError, extractResponseData } from './apiClient';

export interface OperationsSummary {
    activeTrips: number;
    partnerCounts: {
        hotels: number;
        restaurants: number;
        guides: number;
        vehicles: number;
    };
    alerts: {
        missingConfirmations: number;
        hotelUnavailable: number;
        transportMissing: number;
        guidesCancelled: number;
        bookingsConfirmed: number;
    };
}

export const getOperationsSummary = async () => {
    try {
        const response = await api.get('/operations/summary');
        return extractResponseData<OperationsSummary>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching operations summary');
    }
};
