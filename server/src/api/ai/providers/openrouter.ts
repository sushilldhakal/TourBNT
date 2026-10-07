import { config } from '../../../config/config';
import { AIProvider, AIProviderError, providerErrorFromStatus, providerFetch, readErrorDetail } from './types';

/** OpenRouter (OpenAI-compatible) using a `:free` model by default. */
export const openRouterProvider: AIProvider = {
    name: 'openrouter',
    isConfigured: () => Boolean(config.ai.openrouter.apiKey),
    async complete({ messages, maxOutputTokens, temperature, signal }) {
        const { apiKey, model } = config.ai.openrouter;
        const res = await providerFetch('openrouter', 'https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'X-Title': 'TourBnT',
            },
            body: JSON.stringify({ model, messages, max_tokens: maxOutputTokens, temperature }),
        });
        if (!res.ok) throw providerErrorFromStatus('openrouter', res.status, await readErrorDetail(res));
        const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            error?: { message?: string; code?: number };
        };
        // OpenRouter sometimes returns 200 with an error body when the upstream free model is throttled.
        if (data.error) {
            throw providerErrorFromStatus('openrouter', data.error.code ?? 502, data.error.message ?? '');
        }
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) throw new AIProviderError('unavailable', 'openrouter returned an empty completion');
        return { text, model };
    },
};
