/**
 * Backend base URL for code that runs on the Next.js server (route handlers, server components).
 *
 * The browser must use the public URL, but the Next server and the API run on the same machine:
 * going through NEXT_PUBLIC_BACKEND_URL (https://tourbnt.com) sends every server-side call out
 * through DNS, the public IP, nginx and a fresh TLS handshake before reaching the API.
 * BACKEND_INTERNAL_URL (e.g. http://127.0.0.1:8000) skips all of that. Not NEXT_PUBLIC, so it is
 * never inlined into the browser bundle; falls back to the public URL when unset.
 */
export const SERVER_BACKEND_URL =
    process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
