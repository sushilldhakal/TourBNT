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
    GUIDE = 'guide',
    HOTEL = 'hotel',
    GUESTHOUSE = 'guesthouse',
    RESTAURANT = 'restaurant',
    TRANSPORT = 'transport',
    ADVERTISER = 'advertiser',
    USER = 'user',
    SUBSCRIBER = 'subscriber',
}

/** Business-partner roles, granted via admin approval of a business application. */
export const BUSINESS_PARTNER_ROLES = [
    UserRole.GUIDE,
    UserRole.HOTEL,
    UserRole.GUESTHOUSE,
    UserRole.RESTAURANT,
    UserRole.TRANSPORT,
    UserRole.ADVERTISER,
] as const;

/**
 * Role groups for different access levels
 */
export const RoleGroups = {
    // Roles that can access the dashboard
    DASHBOARD_ACCESS: [
        UserRole.ADMIN,
        UserRole.SELLER,
        ...BUSINESS_PARTNER_ROLES,
    ],

    // Business-partner roles — limited dashboard scope (own listing only).
    BUSINESS_PARTNER: BUSINESS_PARTNER_ROLES,

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
        [UserRole.GUIDE]: 'Guide',
        [UserRole.HOTEL]: 'Hotel',
        [UserRole.GUESTHOUSE]: 'Guesthouse',
        [UserRole.RESTAURANT]: 'Restaurant',
        [UserRole.TRANSPORT]: 'Transport Provider',
        [UserRole.ADVERTISER]: 'Advertiser',
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
export const getRoleBadgeColor = (role: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!role) return 'outline';

    const colorMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
        [UserRole.ADMIN]: 'destructive',
        [UserRole.SELLER]: 'default',
        [UserRole.GUIDE]: 'secondary',
        [UserRole.HOTEL]: 'secondary',
        [UserRole.GUESTHOUSE]: 'secondary',
        [UserRole.RESTAURANT]: 'secondary',
        [UserRole.TRANSPORT]: 'secondary',
        [UserRole.ADVERTISER]: 'secondary',
        [UserRole.USER]: 'secondary',
        [UserRole.SUBSCRIBER]: 'secondary',
    };

    return colorMap[role] || 'secondary';
};
