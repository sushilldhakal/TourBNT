'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api/apiClient';
import useUserStore from '@/lib/store/useUserStore';

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
                const res = await api.get('/api/users/me');
                setUser(res.data);
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

