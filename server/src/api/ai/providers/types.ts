/**
 * Provider abstraction for the AI writing assistant. The editor and the HTTP layer only ever see
 * these types — adding a paid provider means writing one AIProvider and registering it in ./index.ts.
 */

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AICompletionRequest {
    messages: AIMessage[];
    maxOutputTokens: number;
    temperature: number;
    signal: AbortSignal;
}

export interface AICompletionResult {
    text: string;
    model: string;
}

/**
 * How a provider failed, which decides what the router does next:
 * - rate_limit / quota: provider is exhausted — put it on cooldown and fall back
 * - unavailable: network/5xx/timeout/empty output/auth problem — fall back (no cooldown beyond a short one)
 * - bad_request: the request itself was rejected (e.g. safety filter) — fall back, another model may accept it
 */
export type AIProviderErrorKind = 'rate_limit' | 'quota' | 'unavailable' | 'bad_request';

export class AIProviderError extends Error {
    constructor(
        public readonly kind: AIProviderErrorKind,
        message: string,
        public readonly status?: number,
    ) {
        super(message);
        this.name = 'AIProviderError';
    }
}

export interface AIProvider {
    /** Stable id used in logs and AI_PROVIDER_ORDER. */
    readonly name: string;
    /** False when its credentials are missing; the router skips it silently. */
    isConfigured(): boolean;
    complete(request: AICompletionRequest): Promise<AICompletionResult>;
}

/** Maps an HTTP failure from a provider to an AIProviderError. Never includes the response body's secrets. */
export function providerErrorFromStatus(provider: string, status: number, detail: string): AIProviderError {
    const msg = `${provider} responded ${status}${detail ? `: ${detail.slice(0, 200)}` : ''}`;
    if (status === 429) return new AIProviderError('rate_limit', msg, status);
    if (status === 402) return new AIProviderError('quota', msg, status);
    if (status === 400 || status === 422) return new AIProviderError('bad_request', msg, status);
    return new AIProviderError('unavailable', msg, status);
}

/** fetch wrapper that converts network failures/timeouts into AIProviderError. */
export async function providerFetch(provider: string, url: string, init: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch (err) {
        const aborted = err instanceof Error && err.name === 'AbortError';
        throw new AIProviderError('unavailable', `${provider} ${aborted ? 'timed out' : 'network error'}`);
    }
}

export async function readErrorDetail(res: Response): Promise<string> {
    try {
        const body = (await res.json()) as { error?: { message?: string; status?: string } | string; errors?: Array<{ message?: string }> };
        if (typeof body.error === 'string') return body.error;
        return body.error?.message || body.errors?.[0]?.message || '';
    } catch {
        return '';
    }
}
