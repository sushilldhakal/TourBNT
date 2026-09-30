import { api, extractResponseData, handleApiError } from './apiClient';
import type { CategoryData, Destination, Post, Review, Tour } from '@/types/types';

export interface HomeFeed {
    tours: Tour[];
    categories: CategoryData[];
    destinations: Destination[];
    reviews: Review[];
    posts: Array<Post & { excerpt?: string; commentCount?: number }>;
}

export async function getHomeFeed(): Promise<HomeFeed> {
    try {
        const response = await api.get('/home');
        return extractResponseData<HomeFeed>(response);
    } catch (error) {
        throw handleApiError(error, 'fetching the home page');
    }
}
