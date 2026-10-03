'use client';

import '../dashboard.css';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardLayoutClient } from '@/components/dashboard/layout/DashboardLayoutClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { canAccessDashboard, UserRole } from '@/lib/utils/roles';
import { canAccessDashboardPath } from '@/lib/config/dashboardAccess';
import { redirectToLogin } from '@/lib/api/apiClient';

const isCustomer = (role: string | null | undefined) => role === UserRole.USER;

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, isHydrated } = useAuth();

    useEffect(() => {
        // Wait for useAuth bootstrap to complete before making auth decisions
        if (!isHydrated) {
            return;
        }

        if (!isAuthenticated) {
            // Preserve the current path for redirect after login
            const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/dashboard';
            redirectToLogin(currentPath as string);
            return;
        }

        // Travellers have a few pages of their own here (see dashboardAccess); anything else is not for them.
        if (!canAccessDashboard(user.roles) && !(isCustomer(user.roles) && canAccessDashboardPath(pathname, user.roles))) {
            router.push('/?error=unauthorized');
            return;
        }

        // Role may not open this particular dashboard page → back to the dashboard home.
        if (!canAccessDashboardPath(pathname, user.roles)) {
            router.replace('/dashboard');
        }
    }, [isHydrated, isAuthenticated, user.roles, router, user, pathname]);

    // Show loading while useAuth is fetching user data
    if (!isHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Don't render dashboard if not authenticated (redirect will happen via useEffect)
    // Never render a page the role isn't allowed to see, even for the instant before the redirect lands.
    if (isAuthenticated && (!(canAccessDashboard(user.roles) || isCustomer(user.roles)) || !canAccessDashboardPath(pathname, user.roles))) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
