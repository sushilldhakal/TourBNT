/**
 * Holds the current Cloudflare Turnstile token so the shared API client can attach it to the few
 * requests that need a human check (sign up, sign in, forgot password, contact / enquiry, newsletter).
 * Forms only have to render <TurnstileWidget />; they don't handle the token themselves.
 */
let token: string | null = null;
let resetWidget: (() => void) | null = null;

export const turnstile = {
    set(t: string | null) { token = t; },
    get() { return token; },
    registerReset(fn: (() => void) | null) { resetWidget = fn; },
    /** Tokens are single-use: after a protected request (pass or fail) the widget must produce a new one. */
    reset() {
        token = null;
        try { resetWidget?.(); } catch { /* widget already gone */ }
    },
};

/** Requests the server protects with requireHuman (middlewares/turnstile.ts). */
export function needsHumanCheck(method?: string, url?: string): boolean {
    if ((method ?? 'get').toLowerCase() !== 'post' || !url) return false;
    const path = url.split('?')[0].replace(/\/+$/, '');
    return /(^|\/)(auth\/(register|login|forgot-password)|conversations|subscribers)$/.test(path);
}
