import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, extractResponseData } from '@/lib/api/apiClient';
import useUserStore, { User } from '@/lib/store/useUserStore';
import { logoutUser } from '@/lib/api/users';
import { devLog } from '@/lib/devLogger';

interface UseAuthReturn {
    user: User;
    isAuthenticated: boolean;
    isHydrated: boolean;
    userId: string | null;
    userRole: string | null;
    logout: () => Promise<void>;
    refetch: () => Promise<User | null>;
}

export const useAuth = (): UseAuthReturn => {
    const router = useRouter();
    const { user, setUser, clearUser } = useUserStore();
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (user.id) {
            setIsHydrated(true);
            return;
        }

        const currentPath = window.location.pathname;
        // IMPORTANT:
        // Public site (including 404 pages) should not trigger /users/me bootstrap.
        // Otherwise an unknown URL (custom 404) can be treated as "protected",
        // and a transient 401 clears the user store even if the cookie still exists.
        if (!currentPath.startsWith('/dashboard')) {
            devLog('auth', `non-dashboard route, skip bootstrap: ${currentPath}`);
            setIsHydrated(true);
            return;
        }

        devLog('auth', `protected route, bootstrap /users/me: ${currentPath}`);

        const bootstrap = async () => {
            try {
                const response = await api.get('/users/me');
                const userData = extractResponseData<User>(response);

                if (userData?.id) {
                    const roles = Array.isArray(userData.roles)
                        ? userData.roles[0] || ''
                        : (userData.roles ?? '');
                    setUser({ ...userData, roles });
                    devLog('auth', `bootstrap ok: ${userData.id} role=${roles}`);
                } else {
                    clearUser();
                    devLog('auth', 'bootstrap ok but no user id, cleared');
                }
            } catch (e: unknown) {
                const err = e as { response?: { status?: number }; message?: string };
                if (err?.response?.status === 401) {
                    clearUser();
                    devLog('auth', `bootstrap 401, cleared. path=${currentPath}`);
                } else {
                    devLog('auth', `bootstrap error: ${err?.response?.status ?? ''} ${err?.message ?? ''}`, {
                        path: currentPath,
                    });
                }
            } finally {
                setIsHydrated(true);
            }
        };

        bootstrap();
    }, [setUser, clearUser, user.id]);


    const logout = async () => {
        try {
            await logoutUser();
        } catch {
            /* ignore */
        } finally {
            clearUser();
            // Use Next.js router for SPA navigation (no page reload)
            router.push('/auth/login');
        }
    };

    const refetch = async () => {
        try {
            const response = await api.get('/users/me');
            const userData = extractResponseData<User>(response);
            const roles = Array.isArray(userData.roles) ? userData.roles[0] || '' : (userData.roles ?? '');
            const normalizedUser: User = { ...userData, roles };
            setUser(normalizedUser);
            return normalizedUser;
        } catch {
            clearUser();
            return null;
        }
    };

    return {
        user,
        isAuthenticated: !!user.id,
        isHydrated,
        userId: user.id,
        userRole: user.roles,
        logout,
        refetch,
    };
};
