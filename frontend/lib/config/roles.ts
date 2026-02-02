/**
 * Role definitions and utilities
 * Centralized role management for the application
 */

/**
 * All available user roles in the system
 */
export enum UserRole {
    ADMIN = 'admin',
    SELLER = 'seller',
    ADVERTISER = 'advertiser',
    GUIDE = 'guide',
    VENUE = 'venue',
    USER = 'user',
    SUBSCRIBER = 'subscriber',
}

/**
 * Role groups for different access levels
 */
export const RoleGroups = {
    // Roles that can access the dashboard
    DASHBOARD_ACCESS: [
        UserRole.ADMIN,
        UserRole.SELLER,
        UserRole.ADVERTISER,
        UserRole.GUIDE,
        UserRole.VENUE,
    ],

    // Admin only
    ADMIN_ONLY: [UserRole.ADMIN],

    // Seller only
    SELLER_ONLY: [UserRole.SELLER],

    // Admin and Seller
    ADMIN_AND_SELLER: [UserRole.ADMIN, UserRole.SELLER],

    // Regular users (no dashboard access)
    REGULAR_USERS: [UserRole.USER, UserRole.SUBSCRIBER],

    // All roles
    ALL: Object.values(UserRole),
} as const;

/**
 * Check if a role can access the dashboard
 * @param role - User role to check
 * @returns True if role can access dashboard
 */
export const canAccessDashboard = (role: string | null): boolean => {
    if (!role) return false;
    return (RoleGroups.DASHBOARD_ACCESS as readonly string[]).includes(role);
};

/**
 * Check if user is admin
 * @param role - User role to check
 * @returns True if user is admin
 */
export const isAdmin = (role: string | null): boolean => {
    return role === UserRole.ADMIN;
};

/**
 * Check if user is seller
 * @param role - User role to check
 * @returns True if user is seller
 */
export const isSeller = (role: string | null): boolean => {
    return role === UserRole.SELLER;
};

/**
 * Check if user is admin or seller
 * @param role - User role to check
 * @returns True if user is admin or seller
 */
export const isAdminOrSeller = (role: string | null): boolean => {
    if (!role) return false;
    return (RoleGroups.ADMIN_AND_SELLER as readonly string[]).includes(role);
};

/**
 * Check if user has any of the specified roles
 * @param userRole - User's current role
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has one of the allowed roles
 */
export const hasRole = (userRole: string | null, allowedRoles: UserRole[]): boolean => {
    if (!userRole) return false;
    return (allowedRoles as readonly string[]).includes(userRole);
};

/**
 * Check if user is a regular user (no dashboard access)
 * @param role - User role to check
 * @returns True if user is a regular user
 */
export const isRegularUser = (role: string | null): boolean => {
    if (!role) return false;
    return (RoleGroups.REGULAR_USERS as readonly string[]).includes(role);
};

/**
 * Get user-friendly role name
 * @param role - User role
 * @returns Formatted role name
 */
export const getRoleName = (role: string | null): string => {
    if (!role) return 'Guest';

    const roleMap: Record<string, string> = {
        [UserRole.ADMIN]: 'Administrator',
        [UserRole.SELLER]: 'Seller',
        [UserRole.ADVERTISER]: 'Advertiser',
        [UserRole.GUIDE]: 'Guide',
        [UserRole.VENUE]: 'Venue Manager',
        [UserRole.USER]: 'User',
        [UserRole.SUBSCRIBER]: 'Subscriber',
    };

    return roleMap[role] || role;
};

/**
 * Get role badge color for UI
 * @param role - User role
 * @returns Tailwind color class
 */
export const getRoleBadgeColor = (role: string | null): string => {
    if (!role) return 'bg-gray-500';

    const colorMap: Record<string, string> = {
        [UserRole.ADMIN]: 'destructive',
        [UserRole.SELLER]: 'default',
        [UserRole.ADVERTISER]: 'secondary',
        [UserRole.GUIDE]: 'secondary',
        [UserRole.VENUE]: 'secondary',
        [UserRole.USER]: 'secondary',
        [UserRole.SUBSCRIBER]: 'secondary',
    };

    return colorMap[role] || 'secondary';
};
