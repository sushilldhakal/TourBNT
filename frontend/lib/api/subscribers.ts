import { api, handleApiError, extractResponseData } from './apiClient';

/**
 * Subscriber API Methods
 * Follows server API specifications
 */

export interface Subscriber {
    _id: string;
    id?: string;
    email: string;
    subscribedAt: string;
    createdAt?: string;
}

export interface SubscribersResponse {
    items?: Subscriber[];
    data?: Subscriber[];
    pagination?: {
        currentPage?: number;
        page?: number;
        totalPages: number;
        totalItems?: number;
        total?: number;
        limit?: number;
        itemsPerPage?: number;
    };
}

/**
 * Subscribe email(s) to newsletter
 * Accepts single email or comma/semicolon separated emails
 */
export const subscribeEmail = async (emailInput: string) => {
    try {
        const response = await api.post('/subscribers', { email: emailInput });
        const data = extractResponseData<{ 
            message: string; 
            subscriber?: Subscriber;
            subscribers?: Subscriber[];
            results?: {
                successful: Subscriber[];
                failed: { email: string; error: string }[];
                total: number;
                successCount: number;
                failedCount: number;
            };
        }>(response);
        
        // Handle both single and bulk responses
        if (data.results) {
            return data.results;
        } else if (data.subscribers) {
            return {
                successful: data.subscribers,
                failed: [],
                total: data.subscribers.length,
                successCount: data.subscribers.length,
                failedCount: 0
            };
        } else if (data.subscriber) {
            return {
                successful: [data.subscriber],
                failed: [],
                total: 1,
                successCount: 1,
                failedCount: 0
            };
        }
        
        throw new Error('Invalid response format');
    } catch (error: any) {
        // If error has results in details, return them
        if (error?.response?.data?.error?.details) {
            const details = error.response.data.error.details;
            if (Array.isArray(details)) {
                return {
                    successful: [],
                    failed: details,
                    total: details.length,
                    successCount: 0,
                    failedCount: details.length
                };
            }
        }
        throw handleApiError(error, 'subscribing email');
    }
};

/**
 * Subscribe multiple emails to newsletter (bulk)
 * Makes multiple API calls since backend only supports single email
 */
export const subscribeBulk = async (emails: string[]) => {
    const results = await Promise.allSettled(
        emails.map(email => subscribeEmail(email))
    );
    
    const successful: Subscriber[] = [];
    const failed: { email: string; error: string }[] = [];
    
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            successful.push(...result.value.successful as Subscriber[]);
        } else {
            failed.push({
                email: emails[index],
                error: result.reason?.message || 'Unknown error'
            });
        }
    });
    
    return {
        successful,
        failed,
        total: emails.length,
        successCount: successful.length,
        failedCount: failed.length
    };
};

/**
 * Unsubscribe email from newsletter
 */
export const unsubscribeEmail = async (email: string) => {
    try {
        const response = await api.delete(`/subscribers/${encodeURIComponent(email)}`);
        return extractResponseData(response);
    } catch (error) {
        throw handleApiError(error, 'unsubscribing email');
    }
};

/**
 * Get all subscribers with pagination (admin only)
 */
export const getSubscribers = async (params?: { page?: number; limit?: number }): Promise<SubscribersResponse> => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.page) {
            queryParams.append('page', params.page.toString());
        }
        if (params?.limit) {
            queryParams.append('limit', params.limit.toString());
        }
        
        const url = `/subscribers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await api.get(url);
        return extractResponseData<SubscribersResponse>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching subscribers');
    }
};
