// Runs in the browser before the app starts. Error tracking only, and only when a DSN is configured.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && process.env.NODE_ENV === 'production') {
    import('@sentry/nextjs').then((Sentry) =>
        Sentry.init({
            dsn,
            tracesSampleRate: 0,
            // Sentry 11 collects cookies, headers and request bodies unless told not to — that would ship sign-in cookies and
            // form contents (names, emails, messages) off our servers. Send the error and stack trace only.
            dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
            // Browser noise that is not a bug in our code.
            ignoreErrors: ['ResizeObserver loop limit exceeded', 'ResizeObserver loop completed with undelivered notifications', 'Non-Error promise rejection captured'],
        }),
    );
}
