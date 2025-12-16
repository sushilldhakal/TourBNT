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
 * Check if user has any dashboard access role
 * @param roles - User's roles array
 * @returns True if user can access dashboard
 */
export const canAccessDashboard = (roles: string[]): boolean => {
    return roles.some(role =>
        (RoleGroups.DASHBOARD_ACCESS as readonly string[]).includes(role)
    );
};

/**
 * Check if user is admin
 * @param roles - User's roles array
 * @returns True if user is admin
 */
export const isAdmin = (roles: string[]): boolean => {
    return roles.includes(UserRole.ADMIN);
};

/**
 * Check if user is seller
 * @param roles - User's roles array
 * @returns True if user is seller
 */
export const isSeller = (roles: string[]): boolean => {
    return roles.includes(UserRole.SELLER);
};

/**
 * Check if user is admin or seller
 * @param roles - User's roles array
 * @returns True if user is admin or seller
 */
export const isAdminOrSeller = (roles: string[]): boolean => {
    return roles.some(role =>
        (RoleGroups.ADMIN_AND_SELLER as readonly string[]).includes(role)
    );
};

/**
 * Check if user has any of the specified roles
 * @param userRoles - User's current roles
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has one of the allowed roles
 */
export const hasRole = (userRoles: string[], allowedRoles: UserRole[]): boolean => {
    return userRoles.some(role =>
        (allowedRoles as readonly string[]).includes(role)
    );
};
