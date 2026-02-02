'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdminOrSeller } from '@/lib/config/roles';

/**
 * Seller route group layout (tours management).
 * Redirects users who are not admin or seller to /dashboard.
 */
export default function DashboardSellerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, isHydrated } = useAuth();

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAdminOrSeller(user.roles)) {
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

    if (!isAdminOrSeller(user.roles)) {
        return null;
    }

    return <>{children}</>;
}
