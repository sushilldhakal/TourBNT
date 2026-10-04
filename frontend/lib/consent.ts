import { useSyncExternalStore } from 'react';

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

function parseConsent(raw: string | null): Consent | null {
    try {
        const parsed = raw ? (JSON.parse(raw) as Consent) : null;
        return parsed && parsed.version === 1 && typeof parsed.analytics === 'boolean' ? parsed : null;
    } catch {
        return null;
    }
}

function readRaw(): string | null {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}

export function getConsent(): Consent | null {
    return parseConsent(readRaw());
}

let cachedRaw: string | null = null;
let cachedConsent: Consent | null = null;

function consentSnapshot(): Consent | null {
    const raw = readRaw();
    if (raw !== cachedRaw) {
        cachedRaw = raw;
        cachedConsent = parseConsent(raw);
    }
    return cachedConsent;
}

function subscribeToConsent(onChange: () => void): () => void {
    window.addEventListener(CHANGED, onChange);
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener(CHANGED, onChange);
        window.removeEventListener('storage', onChange);
    };
}

/** The stored cookie choice, kept current; null before the visitor chooses (and during server rendering). */
export function useConsent(): Consent | null {
    return useSyncExternalStore(subscribeToConsent, consentSnapshot, () => null);
}

export function setConsent(analytics: boolean): Consent {
    const consent: Consent = { analytics, decidedAt: new Date().toISOString(), version: 1 };
    try { localStorage.setItem(KEY, JSON.stringify(consent)); } catch { /* storage blocked: the choice just won't persist */ }
    window.dispatchEvent(new CustomEvent(CHANGED, { detail: consent }));
    return consent;
}

/** Re-opens the cookie banner (used by the "Cookie settings" links). */
export function openConsentSettings() {
    window.dispatchEvent(new Event(OPEN));
}

export function onConsentSettingsOpen(cb: () => void): () => void {
    window.addEventListener(OPEN, cb);
    return () => window.removeEventListener(OPEN, cb);
}
