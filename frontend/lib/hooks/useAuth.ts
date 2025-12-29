import { useState, useEffect } from 'react';
import { api, extractResponseData } from '@/lib/api/apiClient';
import useUserStore, { User } from '@/lib/store/useUserStore';
import { logoutUser } from '@/lib/api/users';

/**
 * useAuth Hook
 * Provides authentication state and methods from user store
 * NO token management - all data comes from store
 * Handles bootstrap fetch on first use
 */

interface UseAuthReturn {
    // State
    user: User;
    isAuthenticated: boolean;
    isHydrated: boolean;
    userId: string | null;
    userRole: string | null;

    // Methods
    logout: () => Promise<void>;
    refetch: () => Promise<User | null>;
}

export const useAuth = (): UseAuthReturn => {
    const { user, setUser, clearUser } = useUserStore();
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        // If user is already in store (from login), mark as hydrated
        if (user.id) {
            setIsHydrated(true);
            return;
        }

        // Check if we're on a public/auth route - skip bootstrap to avoid unnecessary 401s
        const currentPath = window.location.pathname;
        const publicRoutes = ['/auth/login', '/auth/register', '/auth/signup', '/auth/forgot', '/auth/verify'];
        const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));

        // Skip bootstrap on public routes - user is clearly not logged in
        if (isPublicRoute) {
            setIsHydrated(true);
            return;
        }

        // Bootstrap: fetch current user on first load (only on non-public routes)
        const bootstrap = async () => {
            try {
                const response = await api.get('/users/me');
                const userData = extractResponseData<User>(response);

                if (userData && userData.id) {
                    setUser(userData);
                } else {
                    // Invalid user data received
                    clearUser();
                }
            } catch (error: any) {
                // Only clear user if we get a 401 (not authenticated)
                // Other errors (network, server restart, etc.) shouldn't clear the user state
                if (error?.response?.status === 401) {
                    // Silently clear user on auth failure (cookie expired, etc.)
                    clearUser();
                } else {
                    // For other errors (network, server restart, etc.), log but don't clear user
                    // The cookie might still be valid, just the server isn't ready yet
                    console.warn('Bootstrap auth check failed (non-401):', error?.message);
                    // Don't clear user - might be a temporary server issue
                }
            } finally {
                setIsHydrated(true);
            }
        };

        bootstrap();
    }, [setUser, clearUser, user.id]);

    const logout = async () => {
        await logoutUser();
        // Redirect to login
        if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
        }
    };

    const refetch = async () => {
        try {
            const response = await api.get('/users/me');
            const userData = extractResponseData<User>(response);
            setUser(userData);
            return userData;
        } catch {
            clearUser();
            return null;
        }
    };

    return {
        // State from store
        user,
        isAuthenticated: !!user.id,
        isHydrated,
        userId: user.id,
        userRole: user.roles,

        // Methods
        logout,
        refetch,
    };
};
