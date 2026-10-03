import type { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { config } from '../config/config';
import { COOKIE_NAMES } from '../utils/cookieUtils';

/**
 * Bot protection with Cloudflare Turnstile (free, mostly invisible). The page renders a widget, which
 * gives the browser a one-time token; the form sends it as `turnstileToken`, and we confirm it with Cloudflare
 * before doing the work. Off until TURNSTILE_SECRET_KEY is set, so local development needs nothing.
 *
 *  - A token Cloudflare says is invalid, or a missing one, is rejected.
 *  - If Cloudflare itself can't be reached we let the request through (and log it): a bot check must not be
 *    able to take signup down. The rate limiters still apply.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
let warned = false;

function isSignedIn(req: Request): boolean {
  const token = req.cookies?.[COOKIE_NAMES.AUTH_TOKEN];
  if (!token) return false;
  try {
    return !!(verify(token, config.jwtSecret) as { sub?: string })?.sub;
  } catch {
    return false;
  }
}

export function requireHuman(opts: { skipIfSignedIn?: boolean } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      if (!warned && process.env.NODE_ENV === 'production') {
        console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set — bot protection is OFF.');
        warned = true;
      }
      return next();
    }
    if (opts.skipIfSignedIn && isSignedIn(req)) return next();

    const token = (req.body?.turnstileToken ?? req.headers['x-turnstile-token']) as string | undefined;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: { code: 'HUMAN_CHECK_REQUIRED', message: 'Please complete the human check and try again.' } });
    }

    try {
      const body = new URLSearchParams({ secret, response: token });
      if (req.ip) body.set('remoteip', req.ip);
      const r = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(5000) });
      const result = (await r.json()) as { success?: boolean };
      if (!result.success) {
        return res.status(403).json({ error: { code: 'HUMAN_CHECK_FAILED', message: 'The human check failed. Please reload the page and try again.' } });
      }
    } catch (err) {
      console.error('[turnstile] Cloudflare verification unreachable, letting the request through:', (err as Error).message);
    }
    next();
  };
}
