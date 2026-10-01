import { api, handleApiError, extractResponseData, extractList } from './apiClient';

export interface BusinessPartnerAvailabilityBlock {
    id: string;
    businessPartnerId: string;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string | null;
}

export const getAvailabilityBlocks = async (businessPartnerId: string, date?: string) => {
    try {
        const response = await api.get(`/business-partners/${businessPartnerId}/availability-blocks`, { params: { date } });
        return extractList<BusinessPartnerAvailabilityBlock>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching availability blocks');
    }
};

export const createAvailabilityBlock = async (businessPartnerId: string, date: string, startTime: string, endTime: string, reason?: string) => {
    try {
        const response = await api.post(`/business-partners/${businessPartnerId}/availability-blocks`, { date, startTime, endTime, reason });
        return extractResponseData<BusinessPartnerAvailabilityBlock>(response);
    } catch (error) {
        throw handleApiError(error, 'creating availability block');
    }
};

export const deleteAvailabilityBlock = async (businessPartnerId: string, blockId: string) => {
    try {
        const response = await api.delete(`/business-partners/${businessPartnerId}/availability-blocks/${blockId}`);
        return response.data;
    } catch (error) {
        throw handleApiError(error, 'deleting availability block');
    }
};
