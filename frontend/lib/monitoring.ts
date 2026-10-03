/**
 * Error reporting for client code (error boundaries). Sentry is loaded lazily and only when NEXT_PUBLIC_SENTRY_DSN
 * is set, so without it nothing extra is downloaded or sent.
 */
export function reportError(error: unknown): void {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    import('@sentry/nextjs').then((Sentry) => Sentry.captureException(error)).catch(() => undefined);
}
