/**
 * Dev-only logger. POSTs to /api/log so messages appear in terminal (Next dev server).
 * No-op when not in browser or not in development.
 */
const isDev = process.env.NODE_ENV === 'development';

export function devLog(tag: string, message: string, meta?: Record<string, unknown>) {
    if (!isDev || typeof window === 'undefined') return;
    const payload = meta ? { message, tag, ...meta } : { message, tag };
    fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).catch(() => {});
}
