import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { AIMessage, AIProvider, AIProviderError, getProviderChain } from './providers';

export interface AIAttempt {
    provider: string;
    outcome: 'success' | AIProviderError['kind'] | 'skipped_cooldown';
    latencyMs: number;
    error?: string;
}

export type AIRouterResult =
    | { ok: true; text: string; provider: string; model: string; attempts: AIAttempt[] }
    | { ok: false; attempts: AIAttempt[] };

/**
 * provider name -> epoch ms until which it is skipped. Per process (each PM2 worker learns on its own),
 * which is fine: it only saves a doomed round-trip, the fallback itself is stateless.
 */
const cooldownUntil = new Map<string, number>();

function startCooldown(provider: string, kind: AIProviderError['kind']) {
    const base = config.ai.providerCooldownMs;
    if (kind === 'rate_limit' || kind === 'quota') cooldownUntil.set(provider, Date.now() + base);
    else if (kind === 'unavailable') cooldownUntil.set(provider, Date.now() + Math.floor(base / 4));
}

/**
 * Tries each configured provider in order and returns the first completion. Rate limits, quota
 * exhaustion and any other provider failure fall through to the next provider; when none is left the
 * result is `{ ok: false }` and the caller reports AI_LIMIT_REACHED. Provider errors never escape.
 */
export async function routeCompletion(
    messages: AIMessage[],
    providers: AIProvider[] = getProviderChain(),
): Promise<AIRouterResult> {
    const attempts: AIAttempt[] = [];

    for (const provider of providers) {
        if ((cooldownUntil.get(provider.name) ?? 0) > Date.now()) {
            attempts.push({ provider: provider.name, outcome: 'skipped_cooldown', latencyMs: 0 });
            continue;
        }

        const started = Date.now();
        try {
            const { text, model } = await provider.complete({
                messages,
                maxOutputTokens: config.ai.maxOutputTokens,
                temperature: 0.7,
                signal: AbortSignal.timeout(config.ai.requestTimeoutMs),
            });
            attempts.push({ provider: provider.name, outcome: 'success', latencyMs: Date.now() - started });
            return { ok: true, text, provider: provider.name, model, attempts };
        } catch (err) {
            const kind = err instanceof AIProviderError ? err.kind : 'unavailable';
            const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
            // Messages are built from status codes/short provider detail only — no keys or prompt text.
            const error = timedOut ? `${provider.name} timed out` : err instanceof Error ? err.message : 'unknown error';
            attempts.push({ provider: provider.name, outcome: kind, latencyMs: Date.now() - started, error });
            startCooldown(provider.name, kind);
            logger.warn(`[ai] ${provider.name} failed, falling back`, { kind, error });
        }
    }

    return { ok: false, attempts };
}

/** Test hook. */
export function resetProviderCooldowns() {
    cooldownUntil.clear();
}
