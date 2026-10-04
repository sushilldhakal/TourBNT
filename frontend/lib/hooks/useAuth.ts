import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiErrorStatus, extractResponseData } from '@/lib/api/apiClient';
import { useIsClient } from './useIsClient';
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

let bootstrapInFlight: Promise<{ data?: unknown }> | null = null;

/** Only the dashboard needs the signed-in user up front; the public site must not call /users/me. */
const needsBootstrap = () => window.location.pathname.startsWith('/dashboard');

export const useAuth = (): UseAuthReturn => {
    const router = useRouter();
    const { user, setUser, clearUser } = useUserStore();
    const isClient = useIsClient();
    const [bootstrapped, setBootstrapped] = useState(false);
    // Hydrated once on the client and either the user is known, this route doesn't load them, or loading finished.
    const isHydrated = isClient && (!!user.id || !needsBootstrap() || bootstrapped);

    useEffect(() => {
        if (user.id || !needsBootstrap()) return;

        const currentPath = window.location.pathname;
        devLog('auth', `protected route, bootstrap /users/me: ${currentPath}`);

        // useAuth is mounted by dozens of components; share one in-flight
        // /users/me instead of every instance firing its own.
        const bootstrap = async () => {
            try {
                if (!bootstrapInFlight) {
                    bootstrapInFlight = api.get('/users/me').finally(() => { bootstrapInFlight = null; });
                }
                const response = await bootstrapInFlight;
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
                const status = apiErrorStatus(e);
                if (status === 401) {
                    clearUser();
                    devLog('auth', `bootstrap 401, cleared. path=${currentPath}`);
                } else {
                    devLog('auth', `bootstrap error: ${status ?? ''} ${e instanceof Error ? e.message : ''}`, {
                        path: currentPath,
                    });
                }
            } finally {
                setBootstrapped(true);
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
