import { useEffect } from 'react';
import useUserStore from '../store/useUserStore';
import { fetchCurrentUser } from '../api/userApi';
import { isAdmin, isAdminOrSeller, isSeller } from '../utils/roles';

/**
 * Hook to access current user state
 * Automatically fetches user on mount if not already loaded
 */
export const useUser = (autoFetch = false) => {
    const { user, setUser, clearUser } = useUserStore();

    useEffect(() => {
        // Auto-fetch user if requested and user is not loaded
        if (autoFetch && !user.id) {
            fetchCurrentUser().catch((err) => {
                console.error('Auto-fetch user failed:', err);
            });
        }
    }, [autoFetch, user.id]);

    return {
        user,
        setUser,
        clearUser,
        isAuthenticated: !!user.id,
        isAdmin: isAdmin(user.roles),
        isSeller: isSeller(user.roles),
        isAdminOrSeller: isAdminOrSeller(user.roles),
    };
};
