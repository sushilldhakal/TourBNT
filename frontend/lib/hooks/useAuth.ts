import { useState, useEffect } from 'react';
import { api } from '@/lib/api/apiClient';
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

        // Bootstrap: fetch current user on first load
        const bootstrap = async () => {
            try {
                const response = await api.get('/api/users/me');
                setUser(response.data);
            } catch (err: any) {
                // Silently clear user on auth failure (cookie expired, etc.)
                clearUser();
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
            const response = await api.get('/api/users/me');
            setUser(response.data);
            return response.data;
        } catch (err) {
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
