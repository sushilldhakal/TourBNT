/**
 * The visitor's cookie choice. "Essential" cookies (sign-in, cart, theme) never need consent and are
 * always on; the only optional category is analytics. Nothing optional loads until the visitor says yes.
 */
export interface Consent {
    analytics: boolean;
    decidedAt: string;
    version: 1;
}

const KEY = 'tourbnt:consent';
const CHANGED = 'tourbnt:consent-changed';
const OPEN = 'tourbnt:consent-open';

export function getConsent(): Consent | null {
    try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? (JSON.parse(raw) as Consent) : null;
        return parsed && parsed.version === 1 && typeof parsed.analytics === 'boolean' ? parsed : null;
    } catch {
        return null;
    }
}

export function setConsent(analytics: boolean): Consent {
    const consent: Consent = { analytics, decidedAt: new Date().toISOString(), version: 1 };
    try { localStorage.setItem(KEY, JSON.stringify(consent)); } catch { /* storage blocked: the choice just won't persist */ }
    window.dispatchEvent(new CustomEvent(CHANGED, { detail: consent }));
    return consent;
}

export function onConsentChange(cb: (c: Consent) => void): () => void {
    const handler = (e: Event) => cb((e as CustomEvent<Consent>).detail);
    window.addEventListener(CHANGED, handler);
    return () => window.removeEventListener(CHANGED, handler);
}

/** Re-opens the cookie banner (used by the "Cookie settings" links). */
export function openConsentSettings() {
    window.dispatchEvent(new Event(OPEN));
}

export function onConsentSettingsOpen(cb: () => void): () => void {
    window.addEventListener(OPEN, cb);
    return () => window.removeEventListener(OPEN, cb);
}
