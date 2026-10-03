import * as Sentry from '@sentry/nextjs';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
    }
}

// Reports errors thrown while rendering on the server (no-op when Sentry was not initialised).
export const onRequestError = Sentry.captureRequestError;
