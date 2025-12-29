'use client';

import { useEffect } from 'react';
import { api, extractResponseData } from '@/lib/api/apiClient';
import useUserStore, { User } from '@/lib/store/useUserStore';

/**
 * AuthBootstrap Component
 * Fetches current user data on app initialization
 * Runs once when the app mounts
 * 
 * This component has no UI - it only initializes auth state
 */
export default function AuthBootstrap() {
    const { setUser, clearUser, setHydrated } = useUserStore();

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const res = await api.get('/users/me');
                const userData = extractResponseData<User>(res);
                setUser(userData);
            } catch {
                clearUser();
            } finally {
                setHydrated();
            }
        };

        bootstrap();
    }, [setUser, clearUser, setHydrated]);

    return null;
}

