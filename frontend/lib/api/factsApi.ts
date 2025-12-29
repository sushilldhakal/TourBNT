import { api, extractResponseData, handleApiError } from "./apiClient";

/**
 * Get all facts (Admin or Seller only)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 */
export const getAllFacts = async (page: number = 1, limit: number = 10) => {
    try {
        const response = await api.get('/facts', {
            params: { page, limit }
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching facts');
    }
};

/**
 * Get facts for a specific user (Owner or Admin)
 * @param userId - User ID
 */
export const getUserFacts = async (userId: string) => {
    try {
        const response = await api.get(`/facts/user/${userId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching user facts');
    }
};

/**
 * Get single fact by ID (Owner or Admin)
 * @param factId - Fact ID
 */
export const getSingleFacts = async (factId: string) => {
    try {
        const response = await api.get(`/facts/${factId}`);
        const data = extractResponseData(response);
        // Server returns { facts: ... }, extract just the facts
        return (data as any)?.facts || data;
    } catch (error) {
        throw handleApiError(error, 'fetching single fact');
    }
};

/**
 * Create a new fact (Admin or Seller only)
 * @param factData - Fact data as FormData
 */
export const addFacts = async (factData: FormData) => {
    try {
        const response = await api.post('/facts', factData);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'creating fact');
    }
};

/**
 * Update a fact (Owner or Admin)
 * @param factData - Fact data as FormData
 * @param factId - Fact ID
 */
export const updateFacts = async (factData: FormData, factId: string) => {
    try {
        const response = await api.patch(`/facts/${factId}`, factData);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating fact');
    }
};

/**
 * Delete a single fact (Owner or Admin)
 * Uses the bulk delete endpoint with a single ID
 * @param factId - Fact ID
 */
export const deleteFacts = async (factId: string) => {
    try {
        const response = await api.delete('/facts', { 
            data: { ids: [factId] } 
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting fact');
    }
};

/**
 * Bulk delete multiple facts (Admin or Seller only)
 * @param factIds - Array of fact IDs
 */
export const deleteMultipleFacts = async (factIds: string[]) => {
    try {
        const response = await api.delete('/facts', { 
            data: { ids: factIds } 
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting multiple facts');
    }
};
