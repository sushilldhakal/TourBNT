import { UserRole } from './roles';

export const PERMISSIONS = {
    MANAGE_USERS: 'manage_users',
    MANAGE_SUBSCRIBERS: 'manage_subscribers',
    MANAGE_TOURS: 'manage_tours',
    MANAGE_POSTS: 'manage_posts',
    MANAGE_GALLERY: 'manage_gallery',
    VIEW_DASHBOARD: 'view_dashboard',
} as const;

export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
    [UserRole.ADMIN]: Object.values(PERMISSIONS),
    [UserRole.SELLER]: [
        PERMISSIONS.MANAGE_TOURS,
        PERMISSIONS.MANAGE_POSTS,
        PERMISSIONS.MANAGE_GALLERY,
        PERMISSIONS.VIEW_DASHBOARD,
    ],
    [UserRole.ADVERTISER]: [PERMISSIONS.VIEW_DASHBOARD],
    [UserRole.GUIDE]: [PERMISSIONS.VIEW_DASHBOARD],
    [UserRole.HOTEL]: [PERMISSIONS.VIEW_DASHBOARD],
    [UserRole.GUESTHOUSE]: [PERMISSIONS.VIEW_DASHBOARD],
    [UserRole.RESTAURANT]: [PERMISSIONS.VIEW_DASHBOARD],
    [UserRole.TRANSPORT]: [PERMISSIONS.VIEW_DASHBOARD],
    [UserRole.USER]: [],
    [UserRole.SUBSCRIBER]: [],
};

export function hasPermission(role: string | null, permission: string): boolean {
    if (!role) return false;
    const perms = ROLE_PERMISSIONS[role];
    return perms?.includes(permission) ?? false;
}
