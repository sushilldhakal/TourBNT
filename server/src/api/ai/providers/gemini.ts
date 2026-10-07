import { config } from '../../../config/config';
import { AIProvider, AIProviderError, providerErrorFromStatus, providerFetch, readErrorDetail } from './types';

/** Google Gemini via the Generative Language REST API (free tier). */
export const geminiProvider: AIProvider = {
    name: 'gemini',
    isConfigured: () => Boolean(config.ai.gemini.apiKey),
    async complete({ messages, maxOutputTokens, temperature, signal }) {
        const model = config.ai.gemini.model;
        const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
        const contents = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

        const res = await providerFetch(
            'gemini',
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            {
                method: 'POST',
                signal,
                // Key in a header, not the query string, so it never lands in URL logs.
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.ai.gemini.apiKey! },
                body: JSON.stringify({
                    ...(system && { systemInstruction: { parts: [{ text: system }] } }),
                    contents,
                    // Thinking tokens count against maxOutputTokens and add seconds of latency; short edits don't need them.
                    generationConfig: { temperature, maxOutputTokens, thinkingConfig: { thinkingBudget: 0 } },
                }),
            },
        );
        if (!res.ok) {
            // Gemini reports an exhausted free quota as 429 RESOURCE_EXHAUSTED.
            throw providerErrorFromStatus('gemini', res.status, await readErrorDetail(res));
        }
        const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
            promptFeedback?: { blockReason?: string };
        };
        if (data.promptFeedback?.blockReason) {
            throw new AIProviderError('bad_request', `gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
        }
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
        if (!text) throw new AIProviderError('unavailable', 'gemini returned an empty completion');
        return { text, model };
    },
};
