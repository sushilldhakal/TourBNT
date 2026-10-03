import * as Sentry from '@sentry/nextjs';

// Server-side rendering errors. Errors only, no personal data; does nothing without a DSN.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && process.env.NODE_ENV === 'production') {
    Sentry.init({
        dsn,
        tracesSampleRate: 0,
        // Sentry 11 collects cookies, headers and request bodies by default; send the error and stack trace only.
        dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    });
}
