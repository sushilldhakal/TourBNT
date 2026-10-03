import * as Sentry from '@sentry/node';

/**
 * Error tracking. Inert until SENTRY_DSN is set. Errors only: no performance tracing, and no personal data
 * (dataCollection below) is attached to events. Imported first by server.ts so it can see everything.
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
    // Sentry 11 collects cookies, headers and request bodies unless told not to — that would ship sign-in cookies and
    // form contents (names, emails, messages) off our servers. Send the error and stack trace only.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
  });
  console.log('[sentry] error tracking enabled');
}

export const sentryEnabled = !!dsn;
export { Sentry };
