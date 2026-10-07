import { api, extractResponseData } from './apiClient';
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
    /** Requests the user has left in their rolling 24h allowance. */
    remainingToday?: number;
}

/**
 * Generate AI completion based on prompt and option.
 *
 * Errors are rethrown untouched (an AxiosError) so callers can read the status and the server's
 * `code` via apiErrorStatus / aiErrorCode.
 */
export const generateCompletion = async (
    params: GenerateCompletionParams
): Promise<GenerateCompletionResponse> => {
    const response = await api.post<GenerateCompletionResponse>('/ai/generate', params);
    return extractResponseData<GenerateCompletionResponse>(response);
};

/** The server's AI error code: 'AI_LIMIT_REACHED' (all providers exhausted) or 'AI_USER_LIMIT_REACHED' (this user's cap). */
export function aiErrorCode(error: unknown): string | undefined {
    if (!isAxiosError(error)) return undefined;
    const code: unknown = error.response?.data?.code;
    return typeof code === 'string' ? code : undefined;
}
