import { FaqData } from "../types";
import { api, extractResponseData, handleApiError } from "./apiClient";

/**
 * Get all FAQs (PUBLIC)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 */
export const getAllFaqs = async (page: number = 1, limit: number = 10) => {
    try {
        const response = await api.get('/faqs', {
            params: { page, limit }
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'fetching FAQs');
    }
};

/**
 * Get FAQs for a specific user (Owner or Admin)
 * @param userId - User ID
 */
export const getUserFaq = async (userId: string): Promise<FaqData[]> => {
    try {
        const response = await api.get(`/api/faqs/user/${userId}`);
        return extractResponseData(response) as FaqData[];
    } catch (error) {
        throw handleApiError(error, 'fetching user FAQs');
    }
};


/**
 * Get single FAQ by ID (PUBLIC)
 * @param faqId - FAQ ID
 */
export const getSingleFaq = async (faqId: string) => {
    try {
        const response = await api.get(`/api/faqs/${faqId}`);
        const data = extractResponseData(response);
        // Server returns { faq: ... }, extract just the faq
        return (data as any)?.faq || data;
    } catch (error) {
        throw handleApiError(error, 'fetching single FAQ');
    }
};

/**
 * Create a new FAQ (Admin or Seller only)
 * @param faqData - FAQ data as FormData
 */
export const addFaq = async (faqData: FormData) => {
    try {
        const response = await api.post('/faqs', faqData);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'creating FAQ');
    }
};

/**
 * Update a FAQ (Owner or Admin)
 * @param faqData - FAQ data as JSON object (not FormData)
 * @param faqId - FAQ ID
 */
export const updateFaq = async (faqData: { question: string; answer: string }, faqId: string) => {
    try {
        const response = await api.patch(`/api/faqs/${faqId}`, faqData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'updating FAQ');
    }
};

/**
 * Delete a single FAQ (Owner or Admin)
 * @param faqId - FAQ ID
 */
export const deleteFaq = async (faqId: string) => {
    try {
        const response = await api.delete(`/api/faqs/${faqId}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting FAQ');
    }
};

/**
 * Bulk delete multiple FAQs (Admin or Seller only)
 * @param faqIds - Array of FAQ IDs
 */
export const deleteMultipleFaqs = async (faqIds: string[]) => {
    try {
        const response = await api.delete('/faqs', { data: { ids: faqIds } });
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'deleting multiple FAQs');
    }
};
