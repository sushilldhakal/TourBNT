/**
 * Single frontend role list. Values match the Postgres `user_role` enum
 * in server/src/db/schema.ts. Import from here or from lib/utils/roles — they are the same module.
 */
export {
    UserRole,
    BUSINESS_PARTNER_ROLES,
    RoleGroups,
    canAccessDashboard,
    isAdmin,
    isSeller,
    isAdminOrSeller,
    hasRole,
    isRegularUser,
    getRoleName,
    getRoleBadgeColor,
} from '../utils/roles';
