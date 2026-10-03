'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { getConsent, onConsentChange } from '@/lib/consent';

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Google Analytics 4 — loaded only when NEXT_PUBLIC_GA_ID is configured AND the visitor accepted analytics
 * cookies. If they later decline, it stops loading on the next page view. Renders nothing otherwise.
 */
export function Analytics() {
    const [allowed, setAllowed] = useState(false);
    const pathname = usePathname();
    const search = useSearchParams();

    useEffect(() => {
        setAllowed(!!getConsent()?.analytics);
        return onConsentChange((c) => setAllowed(c.analytics));
    }, []);

    useEffect(() => {
        if (!allowed || !GA_ID || typeof window.gtag !== 'function') return;
        const qs = search?.toString();
        window.gtag('event', 'page_view', { page_path: qs ? `${pathname}?${qs}` : pathname });
    }, [allowed, pathname, search]);

    if (!GA_ID || !allowed) return null;

    return (
        <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { anonymize_ip: true, send_page_view: false });
            `}</Script>
        </>
    );
}
