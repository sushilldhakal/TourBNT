'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/monitoring';

/** Last-resort boundary for errors in the root layout itself; it must render its own <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        reportError(error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', margin: 0, padding: 16 }}>
                <div style={{ maxWidth: 420, textAlign: 'center' }}>
                    <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
                    <p style={{ color: '#666', marginBottom: 24 }}>The site hit an unexpected problem. It has been reported. Please try again.</p>
                    <button onClick={reset} style={{ padding: '10px 20px', borderRadius: 6, border: 0, background: '#667eea', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Try again</button>
                </div>
            </body>
        </html>
    );
}
