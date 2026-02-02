'use client';

import { useEffect } from 'react';
import useUserStore, { type User } from '@/lib/store/useUserStore';
import { api, extractResponseData } from '@/lib/api/apiClient';

/**
 * AuthBootstrap – on public routes (non-dashboard), fetches /users/me once and
 * populates the user store so the header shows correct auth state (e.g. after
 * 404 or full page load). Dashboard uses useAuth, which fetches /users/me itself.
 */
export default function AuthBootstrap() {
    const { setUser, clearUser, setHydrated } = useUserStore();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const path = window.location.pathname;
        if (path.startsWith('/dashboard')) return;

        let cancelled = false;

        const bootstrap = async () => {
            try {
                const response = await api.get('/users/me');
                const userData = extractResponseData<User>(response);

                if (cancelled) return;

                if (userData?.id) {
                    const roles = Array.isArray(userData.roles)
                        ? (userData.roles[0] ?? '')
                        : (userData.roles ?? '');
                    setUser({ ...userData, roles });
                } else {
                    clearUser();
                }
            } catch (e: unknown) {
                if (cancelled) return;
                const err = e as { response?: { status?: number } };
                if (err?.response?.status === 401) {
                    clearUser();
                }
            } finally {
                if (!cancelled) setHydrated();
            }
        };

        bootstrap();
        return () => { cancelled = true; };
    }, [setUser, clearUser, setHydrated]);

    return null;
}