import { api } from './apiClient';
import { isAxiosError } from 'axios';

/**
 * AI Completion API endpoints
 * Provides AI-powered text generation and editing capabilities
 */

interface GenerateCompletionParams {
    prompt: string;
    option: string;
    command?: string;
}

interface GenerateCompletionResponse {
    completion: string;
}

/**
 * Generate AI completion based on prompt and option
 * @param params - The completion parameters
 * @returns Promise with the AI-generated completion
 * @throws Error if the API call fails
 */
export const generateCompletion = async (
    params: GenerateCompletionParams
): Promise<GenerateCompletionResponse> => {
    try {
        const response = await api.post<GenerateCompletionResponse>(
            '/ai/generate',
            params
        );

        if (response.status !== 200) {
            throw new Error(`Error: ${response.statusText}`);
        }

        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            // Handle Axios errors (network errors, 4xx, 5xx responses)
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`AI generation failed: ${errorMessage}`);
        } else {
            // Handle non-Axios errors
            const errorMessage = String(error);
            throw new Error(`AI generation failed: ${errorMessage}`);
        }
    }
};
