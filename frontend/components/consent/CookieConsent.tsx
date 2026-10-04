'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { onConsentSettingsOpen, openConsentSettings, setConsent, useConsent } from '@/lib/consent';
import { useIsClient } from '@/lib/hooks/useIsClient';

/** The cookie notice. Shown until the visitor chooses; can be reopened from the footer. */
export function CookieConsent() {
    const isClient = useIsClient();
    const consent = useConsent();
    // Chosen this visit (covers storage being blocked, where the choice can't be read back).
    const [dismissed, setDismissed] = useState(false);
    // Reopened from a "Cookie settings" link.
    const [reopened, setReopened] = useState(false);

    useEffect(() => onConsentSettingsOpen(() => setReopened(true)), []);

    const open = reopened || (isClient && !consent && !dismissed);
    if (!open) return null;

    const choose = (analytics: boolean) => {
        setConsent(analytics);
        setDismissed(true);
        setReopened(false);
    };

    return (
        <div role="dialog" aria-modal="false" aria-labelledby="cookie-consent-title" className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 pointer-events-none">
            <div className="pointer-events-auto mx-auto max-w-3xl rounded-lg border border-border bg-card p-4 sm:p-5 shadow-lg">
                <h2 id="cookie-consent-title" className="font-semibold mb-1">We use cookies</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Essential cookies keep you signed in and remember your cart, so they are always on. With your OK we also use analytics cookies to see which pages are useful and fix what is not.
                    {' '}<Link href="/cookies" className="text-primary underline-offset-4 hover:underline">Cookie Policy</Link>
                </p>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <Button variant="outline" onClick={() => choose(false)}>Essential only</Button>
                    <Button onClick={() => choose(true)}>Accept all</Button>
                </div>
            </div>
        </div>
    );
}

/** A link-style button that reopens the banner. */
export function CookieSettingsButton({ className }: { className?: string }) {
    return (
        <button
            type="button"
            className={className}
            onClick={openConsentSettings}
        >
            Cookie settings
        </button>
    );
}
