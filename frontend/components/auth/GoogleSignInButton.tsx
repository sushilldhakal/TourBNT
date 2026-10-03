'use client';

import { useEffect, useRef, useState } from 'react';
import { loginWithGoogle } from '@/lib/api/users';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (cfg: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: string }) => void;
                    renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
                };
            };
        };
    }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;
function loadGoogle(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = SRC;
            s.async = true;
            s.defer = true;
            s.onload = () => resolve();
            s.onerror = () => { scriptPromise = null; reject(new Error('Google sign-in failed to load')); };
            document.head.appendChild(s);
        });
    }
    return scriptPromise;
}

/**
 * "Continue with Google". Renders nothing until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set, so the login page works
 * without it. Google hands the browser a signed ID token; the server verifies it and signs the visitor in.
 */
export function GoogleSignInButton({ keepMeSignedIn = false, onSuccess, onError }: {
    keepMeSignedIn?: boolean;
    onSuccess: () => void;
    onError: (message: string) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    // The callback is registered once, so keep the latest handlers in a ref.
    const handlers = useRef({ keepMeSignedIn, onSuccess, onError });
    handlers.current = { keepMeSignedIn, onSuccess, onError };

    useEffect(() => {
        if (!CLIENT_ID) return;
        let cancelled = false;
        loadGoogle()
            .then(() => {
                if (cancelled || !ref.current || !window.google) return;
                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: async ({ credential }) => {
                        if (!credential) return handlers.current.onError('Google sign-in was cancelled.');
                        try {
                            await loginWithGoogle(credential, handlers.current.keepMeSignedIn);
                            handlers.current.onSuccess();
                        } catch (err: any) {
                            const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message;
                            handlers.current.onError(msg || 'Google sign-in failed. Please try again.');
                        }
                    },
                });
                // renderButton appends; clear first so a second run can't leave two buttons stacked.
                ref.current.replaceChildren();
                window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: ref.current.offsetWidth || 320, text: 'continue_with', shape: 'rectangular' });
                setReady(true);
            })
            .catch(() => undefined); // blocked by an ad-blocker etc.: password sign-in still works
        return () => { cancelled = true; };
    }, []);

    if (!CLIENT_ID) return null;
    return <div ref={ref} className={ready ? 'flex justify-center min-h-[44px]' : 'hidden'} />;
}
