'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { reportError } from '@/lib/monitoring';

/** Shown when a page throws while rendering, instead of a blank screen. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        reportError(error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md text-center">
                <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                <p className="text-muted-foreground mb-6">
                    We hit an unexpected problem loading this page. It has been reported. You can try again, or go back to the home page.
                </p>
                {error.digest && <p className="text-xs text-muted-foreground mb-6">Reference: {error.digest}</p>}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={reset} className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Try again</button>
                    <Link href="/" className="rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary">Home</Link>
                </div>
            </div>
        </div>
    );
}
