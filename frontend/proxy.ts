import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '@/lib/config/routes';

const DASHBOARD_PREFIX = '/dashboard';
const LOGIN_PATH = ROUTES.LOGIN;

/**
 * Root route protection: redirect unauthenticated users from /dashboard/* to login.
 * For httpOnly cookie we only check existence; role checks remain in client layout (AdminGuard).
 */
export function proxy(request: NextRequest) {  // Changed from 'middleware' to 'proxy'
    const path = request.nextUrl.pathname;
    if (!path.startsWith(DASHBOARD_PREFIX)) return NextResponse.next();

    // Cookie check: must match backend auth cookie name (token; refresh_token as fallback)
    const sessionCookie = request.cookies.get('token') ?? request.cookies.get('refresh_token');
    const isLoggedIn = !!sessionCookie?.value;

    if (!isLoggedIn) {
        const loginUrl = new URL(LOGIN_PATH, request.url);
        loginUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };