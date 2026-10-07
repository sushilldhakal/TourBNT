import { config } from '../../../config/config';
import { AIProvider } from './types';
import { geminiProvider } from './gemini';
import { cloudflareProvider } from './cloudflare';
import { openRouterProvider } from './openrouter';

/** Every provider the server knows about. Register new (e.g. paid) providers here. */
const REGISTRY: Record<string, AIProvider> = {
    [geminiProvider.name]: geminiProvider,
    [cloudflareProvider.name]: cloudflareProvider,
    [openRouterProvider.name]: openRouterProvider,
};

/** Providers in fallback order (AI_PROVIDER_ORDER), unknown names ignored, unconfigured ones dropped. */
export function getProviderChain(): AIProvider[] {
    return config.ai.providers
        .map((name) => REGISTRY[name])
        .filter((p): p is AIProvider => Boolean(p) && p.isConfigured());
}

export * from './types';
