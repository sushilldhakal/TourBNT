import { UserRole } from './roles';
import { RoleGroups } from './roles';

export const ROUTES = {
    DASHBOARD: '/dashboard',
    DASHBOARD_USERS: '/dashboard/users',
    DASHBOARD_SUBSCRIBERS: '/dashboard/subscribers',
    DASHBOARD_SETTINGS: '/dashboard/settings',
    DASHBOARD_TOURS_CATEGORIES: '/dashboard/tours/categories',
    DASHBOARD_TOURS_DESTINATION: '/dashboard/tours/destination',
    LOGIN: '/auth/login',
    HOME: '/',
} as const;

export const ROUTE_ACCESS: Record<string, string[]> = {
    [ROUTES.DASHBOARD_USERS]: [UserRole.ADMIN],
    [ROUTES.DASHBOARD_SUBSCRIBERS]: [UserRole.ADMIN],
    [ROUTES.DASHBOARD_SETTINGS]: [UserRole.ADMIN],
    [ROUTES.DASHBOARD_TOURS_CATEGORIES]: [UserRole.ADMIN],
    [ROUTES.DASHBOARD_TOURS_DESTINATION]: [UserRole.ADMIN],
    [ROUTES.DASHBOARD]: [...(RoleGroups.DASHBOARD_ACCESS as readonly string[])],
};

export function canAccessRoute(role: string | null, pathname: string): boolean {
    if (!role) return false;
    for (const [route, roles] of Object.entries(ROUTE_ACCESS)) {
        if (pathname.startsWith(route)) return roles.includes(role);
    }
    return true;
}
