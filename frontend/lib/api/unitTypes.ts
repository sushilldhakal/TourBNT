import { api, handleApiError, extractResponseData } from './apiClient';

export type UnitBlockChannel = 'direct' | 'private' | 'other' | 'maintenance';

export interface BusinessPartnerUnitType {
    id: string;
    businessPartnerId: string;
    name: string;
    totalUnits: number;
    description?: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UnitTypeInventoryDay {
    date: string;
    total: number;
    blocked: number;
    blockedByChannel: Partial<Record<UnitBlockChannel, number>>;
    reservedByTourBnt: number;
    occupied: number;
    available: number;
}

export interface BusinessPartnerUnitTypeBlock {
    id: string;
    unitTypeId: string;
    date: string;
    channel: UnitBlockChannel;
    blockedCount: number;
    notes?: string | null;
}

export const getUnitTypes = async (businessPartnerId: string) => {
    try {
        const response = await api.get(`/business-partners/${businessPartnerId}/unit-types`);
        return extractResponseData<BusinessPartnerUnitType[]>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching unit types');
    }
};

export const createUnitType = async (businessPartnerId: string, data: { name: string; totalUnits?: number; description?: string }) => {
    try {
        const response = await api.post(`/business-partners/${businessPartnerId}/unit-types`, data);
        return extractResponseData<BusinessPartnerUnitType>(response);
    } catch (error) {
        throw handleApiError(error, 'creating unit type');
    }
};

export const updateUnitType = async (businessPartnerId: string, unitTypeId: string, data: { name?: string; totalUnits?: number; description?: string; isActive?: boolean }) => {
    try {
        const response = await api.patch(`/business-partners/${businessPartnerId}/unit-types/${unitTypeId}`, data);
        return extractResponseData<BusinessPartnerUnitType>(response);
    } catch (error) {
        throw handleApiError(error, 'updating unit type');
    }
};

export const deleteUnitType = async (businessPartnerId: string, unitTypeId: string) => {
    try {
        const response = await api.delete(`/business-partners/${businessPartnerId}/unit-types/${unitTypeId}`);
        return response.data;
    } catch (error) {
        throw handleApiError(error, 'deleting unit type');
    }
};

export const getUnitTypeInventory = async (businessPartnerId: string, unitTypeId: string, from: string, to: string) => {
    try {
        const response = await api.get(`/business-partners/${businessPartnerId}/unit-types/${unitTypeId}/inventory`, { params: { from, to } });
        return extractResponseData<UnitTypeInventoryDay[]>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching unit type inventory');
    }
};

export const setUnitTypeBlock = async (businessPartnerId: string, unitTypeId: string, date: string, channel: UnitBlockChannel, blockedCount: number, notes?: string) => {
    try {
        const response = await api.put(`/business-partners/${businessPartnerId}/unit-types/${unitTypeId}/blocks/${date}`, { channel, blockedCount, notes });
        return extractResponseData<BusinessPartnerUnitTypeBlock>(response);
    } catch (error) {
        throw handleApiError(error, 'saving unit type block');
    }
};

export const getUnitTypeBlocks = async (businessPartnerId: string, unitTypeId: string, date?: string) => {
    try {
        const response = await api.get(`/business-partners/${businessPartnerId}/unit-types/${unitTypeId}/blocks`, { params: { date } });
        return extractResponseData<BusinessPartnerUnitTypeBlock[]>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching unit type blocks');
    }
};
