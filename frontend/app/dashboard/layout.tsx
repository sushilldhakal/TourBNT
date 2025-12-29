'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayoutClient } from '@/components/dashboard/layout/DashboardLayoutClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { canAccessDashboard } from '@/lib/utils/roles';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, isAuthenticated, isHydrated } = useAuth();

    useEffect(() => {
        // Wait for useAuth bootstrap to complete before making auth decisions
        if (!isHydrated) {
            return;
        }

        if (!isAuthenticated) {
            router.push('/auth/login?redirect=/dashboard');
            return;
        }

        if (!canAccessDashboard(user.roles)) {
            router.push('/?error=unauthorized');
            return;
        }
    }, [isHydrated, isAuthenticated, user.roles, router]);

    // Show loading while useAuth is fetching user data
    if (!isHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Don't render dashboard if not authenticated (redirect will happen via useEffect)
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
