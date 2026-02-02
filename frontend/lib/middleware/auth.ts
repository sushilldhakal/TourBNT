/**
 * Helpers for middleware or server components (e.g. isProtectedPath)
 */

export const DASHBOARD_PATHS = ['/dashboard'];

export const ADMIN_PATHS = ['/dashboard/users', '/dashboard/subscribers'];

export function isDashboardPath(pathname: string): boolean {
    return DASHBOARD_PATHS.some((p) => pathname.startsWith(p));
}

export function isAdminOnlyPath(pathname: string): boolean {
    return ADMIN_PATHS.some((p) => pathname.startsWith(p));
}
