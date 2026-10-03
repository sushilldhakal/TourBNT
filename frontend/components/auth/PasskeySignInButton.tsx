'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loginWithPasskey } from '@/lib/api/users';
import { passkeyErrorMessage, passkeysSupported } from '@/lib/api/passkeys';

/**
 * "Sign in with a passkey": the device's fingerprint, face or screen lock instead of a password. Shown only where
 * the browser supports passkeys. People add a passkey from their profile after signing in once.
 */
export function PasskeySignInButton({ keepMeSignedIn = false, onSuccess, onError }: {
    keepMeSignedIn?: boolean;
    onSuccess: () => void;
    onError: (message: string) => void;
}) {
    const [supported, setSupported] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        passkeysSupported().then((ok) => !cancelled && setSupported(ok)).catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    if (!supported) return null;

    const signIn = async () => {
        setBusy(true);
        try {
            await loginWithPasskey(keepMeSignedIn);
            onSuccess();
        } catch (e) {
            onError(passkeyErrorMessage(e, 'Passkey sign-in failed. Please try again.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Button type="button" variant="outline" className="w-full h-11" onClick={signIn} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> : <Fingerprint className="h-5 w-5 mr-2" aria-hidden="true" />}
            Sign in with fingerprint or face
        </Button>
    );
}
