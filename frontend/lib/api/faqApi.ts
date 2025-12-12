import { api } from "./apiClient";

export const getUserFaq = async (userId: string) => {
    try {
        const response = await api.get(`/api/faqs/user/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user FAQs:', error);
        throw error;
    }
};

export const getSingleFaq = async (faqId: string) => {
    try {
        const response = await api.get(`/api/faqs/${faqId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching single FAQ:', error);
        throw error;
    }
};

export const addFaq = async (faqData: FormData) => {
    try {
        return api.post('/api/faqs', faqData);
    } catch (error) {
        throw error;
    }
};

export const updateFaq = async (faqData: FormData, faqId: string) => {
    try {
        return api.patch(`/api/faqs/${faqId}`, faqData);
    } catch (error) {
        throw error;
    }
};

export const deleteFaq = async (faqId: string) => {
    try {
        return api.delete(`/api/faqs/${faqId}`);
    } catch (error) {
        throw error;
    }
};

export const deleteMultipleFaqs = async (faqIds: string[]) => {
    try {
        return api.post('/api/faqs/bulk-delete', { faqIds });
    } catch (error) {
        throw error;
    }
};
