'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loginWithFacebook } from '@/lib/api/users';
import { apiErrorMessage } from '@/lib/api/apiClient';

declare global {
    interface Window {
        FB?: {
            init: (cfg: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
            login: (cb: (r: { status: string; authResponse?: { accessToken: string } | null }) => void, opts?: { scope?: string; auth_type?: string }) => void;
        };
        fbAsyncInit?: () => void;
    }
}

const APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
const SDK_VERSION = process.env.NEXT_PUBLIC_FACEBOOK_SDK_VERSION || 'v23.0';

let sdkPromise: Promise<void> | null = null;
function loadFacebook(): Promise<void> {
    if (window.FB) return Promise.resolve();
    if (!sdkPromise) {
        sdkPromise = new Promise((resolve, reject) => {
            window.fbAsyncInit = () => {
                window.FB!.init({ appId: APP_ID!, cookie: false, xfbml: false, version: SDK_VERSION });
                resolve();
            };
            const s = document.createElement('script');
            s.src = 'https://connect.facebook.net/en_US/sdk.js';
            s.async = true;
            s.defer = true;
            s.crossOrigin = 'anonymous';
            s.onerror = () => { sdkPromise = null; reject(new Error('Facebook sign-in failed to load')); };
            document.head.appendChild(s);
        });
    }
    return sdkPromise;
}

function FacebookLogo() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
    );
}

/**
 * "Continue with Facebook". Renders nothing until NEXT_PUBLIC_FACEBOOK_APP_ID is set. The Facebook SDK hands the
 * browser an access token; the server checks it with Facebook and signs the visitor in.
 */
export function FacebookSignInButton({ keepMeSignedIn = false, onSuccess, onError }: {
    keepMeSignedIn?: boolean;
    onSuccess: () => void;
    onError: (message: string) => void;
}) {
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        if (APP_ID) loadFacebook().then(() => mounted.current && setReady(true)).catch(() => undefined); // blocked by an ad-blocker etc.
        return () => { mounted.current = false; };
    }, []);

    if (!APP_ID || !ready) return null;

    // FB.login must run straight from the click (not after an await) or browsers block its popup.
    const signIn = () => {
        setBusy(true);
        window.FB!.login(({ authResponse }) => {
            if (!authResponse?.accessToken) {
                setBusy(false);
                return onError('Facebook sign-in was cancelled.');
            }
            loginWithFacebook(authResponse.accessToken, keepMeSignedIn)
                .then(onSuccess)
                .catch((err: unknown) => onError(apiErrorMessage(err, 'Facebook sign-in failed. Please try again.')))
                .finally(() => mounted.current && setBusy(false));
        // auth_type=rerequest asks again for the email if the person declined it last time.
        }, { scope: 'public_profile,email', auth_type: 'rerequest' });
    };

    return (
        <Button type="button" variant="outline" className="w-full h-11" onClick={signIn} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> : <span className="mr-2"><FacebookLogo /></span>}
            Continue with Facebook
        </Button>
    );
}
