import useUserStore from '@/lib/store/useUserStore';
import {
    canAccessDashboard,
    isAdmin,
    isSeller,
    isAdminOrSeller,
    isRegularUser,
    UserRole
} from '@/lib/utils/roles';

/**
 * useRole Hook
 * Provides role-checking functions based on user store
 * NO token management - all data comes from store
 */

interface UseRoleReturn {
    // State
    isAuthenticated: boolean;
    userRole: string | null;
    userId: string | null;

    // Role checks
    canAccessDashboard: boolean;
    isAdmin: boolean;
    isSeller: boolean;
    isAdminOrSeller: boolean;
    isRegularUser: boolean;

    // Utility
    hasRole: (role: UserRole) => boolean;
}

export const useRole = (): UseRoleReturn => {
    const user = useUserStore((state) => state.user);

    return {
        // State from store
        isAuthenticated: !!user.id,
        userRole: user.roles,
        userId: user.id,

        // Role checks using utility functions
        canAccessDashboard: canAccessDashboard(user.roles),
        isAdmin: isAdmin(user.roles),
        isSeller: isSeller(user.roles),
        isAdminOrSeller: isAdminOrSeller(user.roles),
        isRegularUser: isRegularUser(user.roles),

        // Utility function
        hasRole: (role: UserRole) => user.roles === role,
    };
};
