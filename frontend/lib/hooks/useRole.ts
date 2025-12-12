import { useState, useEffect } from 'react';
import { getAuthState, AuthState } from '@/lib/utils/auth';
import {
    canAccessDashboard,
    isAdmin,
    isSeller,
    isAdminOrSeller,
    isRegularUser,
    UserRole
} from '@/lib/utils/roles';

/**
 * Hook for managing user roles and permissions
 * @returns Object with authentication state and role checking functions
 */
export const useRole = () => {
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        userRole: null,
        userId: null,
        isExpired: false,
    });

    useEffect(() => {
        // Get initial auth state
        const state = getAuthState();
        setAuthState(state);

        // Optional: Set up an interval to check token expiration
        const interval = setInterval(() => {
            const updatedState = getAuthState();
            setAuthState(updatedState);
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, []);

    return {
        // Auth state
        isAuthenticated: authState.isAuthenticated,
        userRole: authState.userRole,
        userId: authState.userId,

        // Role checking functions
        canAccessDashboard: canAccessDashboard(authState.userRole),
        isAdmin: isAdmin(authState.userRole),
        isSeller: isSeller(authState.userRole),
        isAdminOrSeller: isAdminOrSeller(authState.userRole),
        isRegularUser: isRegularUser(authState.userRole),

        // Utility function to check specific role
        hasRole: (role: UserRole) => authState.userRole === role,
    };
};
