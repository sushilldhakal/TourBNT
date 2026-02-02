'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthRedirectStore } from '@/lib/store/useAuthRedirectStore';
import useUserStore from '@/lib/store/useUserStore';

/**
 * AuthRedirect Component
 * Watches auth redirect store and performs SPA-friendly navigation to login
 * This prevents full page reloads when authentication fails
 */
export function AuthRedirect() {
    const router = useRouter();
    const { shouldRedirectToLogin, redirectPath, clearRedirect } = useAuthRedirectStore();
    const clearUser = useUserStore((state) => state.clearUser);

    useEffect(() => {
        if (!shouldRedirectToLogin) return;

        // Clear user state
        clearUser();

        // Build login URL with redirect parameter
        const loginUrl = redirectPath
            ? `/auth/login?redirect=${encodeURIComponent(redirectPath)}`
            : '/auth/login';

        // Use Next.js router for SPA navigation (no page reload)
        router.push(loginUrl);

        // Clear the redirect flag after navigation
        clearRedirect();
    }, [shouldRedirectToLogin, redirectPath, router, clearRedirect, clearUser]);

    return null;
}
