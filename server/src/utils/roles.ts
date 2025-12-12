/**
 * Role definitions and utilities for backend
 * Centralized role management
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
    // Roles that can access dashboard and admin features
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
 * Check if a role can access dashboard features
 * @param role - User role to check
 * @returns True if role can access dashboard
 */
export const canAccessDashboard = (role: string | string[]): boolean => {
    const roleStr = Array.isArray(role) ? role[0] : role;
    return (RoleGroups.DASHBOARD_ACCESS as readonly string[]).includes(roleStr);
};

/**
 * Check if user is admin
 * @param role - User role to check
 * @returns True if user is admin
 */
export const isAdmin = (role: string | string[]): boolean => {
    const roleStr = Array.isArray(role) ? role[0] : role;
    return roleStr === UserRole.ADMIN;
};

/**
 * Check if user is seller
 * @param role - User role to check
 * @returns True if user is seller
 */
export const isSeller = (role: string | string[]): boolean => {
    const roleStr = Array.isArray(role) ? role[0] : role;
    return roleStr === UserRole.SELLER;
};

/**
 * Check if user is admin or seller
 * @param role - User role to check
 * @returns True if user is admin or seller
 */
export const isAdminOrSeller = (role: string | string[]): boolean => {
    const roleStr = Array.isArray(role) ? role[0] : role;
    return (RoleGroups.ADMIN_AND_SELLER as readonly string[]).includes(roleStr);
};

/**
 * Check if user has any of the specified roles
 * @param userRole - User's current role
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has one of the allowed roles
 */
export const hasRole = (userRole: string | string[], allowedRoles: UserRole[]): boolean => {
    const roleStr = Array.isArray(userRole) ? userRole[0] : userRole;
    return (allowedRoles as readonly string[]).includes(roleStr);
};
