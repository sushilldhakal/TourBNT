import { config } from '../../../config/config';
import { AIProvider, AIProviderError, providerErrorFromStatus, providerFetch, readErrorDetail } from './types';

/** Cloudflare Workers AI via the REST API (free daily neuron allowance). */
export const cloudflareProvider: AIProvider = {
    name: 'cloudflare',
    isConfigured: () => Boolean(config.ai.cloudflare.accountId && config.ai.cloudflare.apiToken),
    async complete({ messages, maxOutputTokens, temperature, signal }) {
        const { accountId, apiToken, model } = config.ai.cloudflare;
        const res = await providerFetch(
            'cloudflare',
            `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId!)}/ai/run/${model}`,
            {
                method: 'POST',
                signal,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
                body: JSON.stringify({ messages, max_tokens: maxOutputTokens, temperature }),
            },
        );
        if (!res.ok) {
            const detail = await readErrorDetail(res);
            // Workers AI signals an exhausted daily allowance with 429, or 4006 in the error body.
            if (res.status === 429 || /4006|daily free allocation/i.test(detail)) {
                throw new AIProviderError('quota', `cloudflare quota exhausted: ${detail.slice(0, 200)}`, res.status);
            }
            throw providerErrorFromStatus('cloudflare', res.status, detail);
        }
        const data = (await res.json()) as { success?: boolean; result?: { response?: string } };
        const text = data.result?.response?.trim();
        if (data.success === false || !text) throw new AIProviderError('unavailable', 'cloudflare returned an empty completion');
        return { text, model };
    },
};
