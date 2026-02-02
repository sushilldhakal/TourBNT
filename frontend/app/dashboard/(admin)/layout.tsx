'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/config/roles';

/**
 * Admin-only route group layout.
 * Redirects non-admin users to /dashboard; dashboard layout already ensured auth.
 */
export default function DashboardAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, isHydrated } = useAuth();

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAdmin(user.roles)) {
            router.replace('/dashboard');
        }
    }, [isHydrated, user.roles, router]);

    if (!isHydrated) {
        return (
            <div className="min-h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!isAdmin(user.roles)) {
        return null;
    }

    return <>{children}</>;
}
