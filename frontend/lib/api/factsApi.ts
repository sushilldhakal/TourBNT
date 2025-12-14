import { api } from "./apiClient";

export const getUserFacts = async (userId: string) => {
    try {
        const response = await api.get(`/api/users/${userId}/facts`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user facts:', error);
        throw error;
    }
};

export const getSingleFacts = async (factId: string) => {
    try {
        const response = await api.get(`/api/facts/${factId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching single fact:', error);
        throw error;
    }
};

export const addFacts = async (factData: FormData) => {
    try {
        return api.post('/api/facts', factData);
    } catch (error) {
        throw error;
    }
};

export const updateFacts = async (factData: FormData, factId: string) => {
    try {
        return api.patch(`/api/facts/${factId}`, factData);
    } catch (error) {
        throw error;
    }
};

export const deleteFacts = async (factId: string) => {
    try {
        return api.delete(`/api/facts/${factId}`);
    } catch (error) {
        throw error;
    }
};

export const deleteMultipleFacts = async (factIds: string[]) => {
    try {
        return api.delete('/api/facts', { data: { ids: factIds } });
    } catch (error) {
        throw error;
    }
};
