/**
 * Barrel for @/utils – utility functions and re-exports.
 * Use: import { cn, hasRole, formatDate } from '@/utils';
 */
export { cn } from '../utils';
export {
    hasRole,
    getRoleName,
    isAdmin,
    isSeller,
    isAdminOrSeller,
    canAccessDashboard,
    UserRole,
    RoleGroups,
    getRoleBadgeColor,
    isRegularUser,
} from './roles';
export { formatDate } from '../tourUtils';
