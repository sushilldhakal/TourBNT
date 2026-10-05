import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '@/lib/config/routes';
import { canAccessDashboardPath } from '@/lib/config/dashboardAccess';
import { canAccessDashboard, isRegularUser } from '@/lib/utils/roles';

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

    // Role gate: the API signs the user's role into the `token` cookie. Decoding
    // it here is a routing decision only (nothing is trusted for data access —
    // the API re-checks every request), so the signature isn't verified.
    // Only dashboard roles are gated here; anything else (a customer, a stale
    // cookie after a role change) falls through to the client layout, which
    // uses the live role.
    const role = roleFromToken(request.cookies.get('token')?.value);
    if (role && isRegularUser(role)) {
        const booking = path.match(/^\/dashboard\/bookings\/([^/]+)/);
        const destination = booking ? `/booking/${booking[1]}` : '/account';
        return NextResponse.redirect(new URL(destination, request.url));
    }
    if (role && canAccessDashboard(role) && !canAccessDashboardPath(path, role)) {
        return NextResponse.redirect(new URL(DASHBOARD_PREFIX, request.url));
    }

    return NextResponse.next();
}

function roleFromToken(token?: string): string | null {
    if (!token) return null;
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const roles = JSON.parse(json).roles;
        return Array.isArray(roles) ? String(roles[0] ?? '') || null : roles ? String(roles) : null;
    } catch {
        return null;
    }
}

export const config = { matcher: ['/dashboard', '/dashboard/:path*'] };