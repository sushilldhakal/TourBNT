/**
 * @deprecated This file is deprecated. Use @/lib/hooks/useAuth hook instead.
 * 
 * This file exists for backward compatibility only.
 * All functions here are deprecated and will be removed in a future version.
 * 
 * Migration guide:
 * - Replace getUserId() with useAuth().user.id
 * - Replace getUserRole() with useAuth().user.roles  
 * - Replace isAuthenticated() with useAuth().isAuthenticated
 * - Replace hasAnyRole() with useAuth().user.roles check
 */

import { getUserId as getIdFromUtils, getUserRole as getRoleFromUtils, isAuthenticated as isAuthFromUtils } from '@/lib/utils/auth';

/**
 * @deprecated Use useAuth().user.id instead
 */
export const getUserId = (): string | null => {
    console.warn('getUserId from @/lib/auth/authUtils is deprecated. Use useAuth().user.id instead.');
    return getIdFromUtils();
};

/**
 * @deprecated Use useAuth().user.roles instead
 */
export const getUserRole = (): string | null => {
    console.warn('getUserRole from @/lib/auth/authUtils is deprecated. Use useAuth().user.roles instead.');
    return getRoleFromUtils();
};

/**
 * @deprecated Use useAuth().isAuthenticated instead
 */
export const isAuthenticated = (): boolean => {
    console.warn('isAuthenticated from @/lib/auth/authUtils is deprecated. Use useAuth().isAuthenticated instead.');
    return isAuthFromUtils();
};

/**
 * @deprecated Use useAuth().user.roles check instead
 */
export const hasAnyRole = (roles: string[]): boolean => {
    console.warn('hasAnyRole from @/lib/auth/authUtils is deprecated. Use useAuth().user.roles check instead.');
    const userRole = getRoleFromUtils();
    return userRole ? roles.includes(userRole) : false;
};

/**
 * @deprecated Use useAuth().user.roles check instead
 */
export const getUserRoles = (): string[] => {
    console.warn('getUserRoles from @/lib/auth/authUtils is deprecated. Use useAuth().user.roles instead.');
    const role = getRoleFromUtils();
    return role ? [role] : [];
};