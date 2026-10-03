'use client';

import { useEffect, useRef } from 'react';
import { turnstile } from '@/lib/turnstile';

declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, opts: Record<string, unknown>) => string;
            reset: (id?: string) => void;
            remove: (id?: string) => void;
        };
    }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
    if (window.turnstile) return Promise.resolve();
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = SCRIPT_SRC;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => { scriptPromise = null; reject(new Error('Turnstile failed to load')); };
            document.head.appendChild(s);
        });
    }
    return scriptPromise;
}

/**
 * Cloudflare Turnstile human check. Drop it into a form; the API client sends its token with the form's
 * request automatically. Renders nothing (and nothing is required) until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 */
export function TurnstileWidget({ className }: { className?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!SITE_KEY || !ref.current) return;
        let widgetId: string | undefined;
        let cancelled = false;
        loadScript()
            .then(() => {
                if (cancelled || !ref.current || !window.turnstile) return;
                widgetId = window.turnstile.render(ref.current, {
                    sitekey: SITE_KEY,
                    theme: 'auto',
                    size: 'flexible',
                    callback: (t: string) => turnstile.set(t),
                    'expired-callback': () => turnstile.set(null),
                    'error-callback': () => turnstile.set(null),
                });
                turnstile.registerReset(() => { if (widgetId) window.turnstile?.reset(widgetId); });
            })
            .catch(() => undefined); // blocked by an ad-blocker etc.: the server decides whether to let the request through
        return () => {
            cancelled = true;
            turnstile.registerReset(null);
            turnstile.set(null);
            if (widgetId) window.turnstile?.remove(widgetId);
        };
    }, []);

    if (!SITE_KEY) return null;
    return <div ref={ref} className={className} />;
}
