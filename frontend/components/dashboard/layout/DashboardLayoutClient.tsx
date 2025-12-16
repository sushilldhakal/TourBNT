'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { Breadcrumbs } from './Breadcrumbs';
import { BreadcrumbsProvider } from '@/providers/BreadcrumbsProvider';
import useDashboardStore from '@/store/dashboardStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';

/**
 * Dashboard Layout Client Component
 * Migrated from dashboard/src/layouts/DashboardLayout.tsx
 * Handles client-side layout rendering and state
 */

interface DashboardLayoutClientProps {
    children: React.ReactNode;
}

export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
    const router = useRouter();
    const { sidebarCollapsed, setSidebarCollapsed } = useDashboardStore();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <BreadcrumbsProvider>
            <div className="flex min-h-screen w-full bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                {/* Sidebar */}
                <DashboardSidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={toggleSidebar}
                />

                {/* Main Content */}
                <div
                    className={cn(
                        'flex flex-1 flex-col transition-all duration-300',
                        sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-[280px]'
                    )}
                >
                    {/* Header */}
                    <DashboardHeader
                        isCollapsed={sidebarCollapsed}
                        onToggleSidebar={toggleSidebar}
                        onLogout={handleLogout}
                    />

                    {/* Page Content */}
                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                        {/* Breadcrumbs */}
                        <div className="flex items-center justify-between">
                            <Breadcrumbs />
                        </div>

                        {/* Page Title */}
                        <div className="flex items-center">
                            <h1 className="text-lg font-semibold md:text-2xl">
                                {/* Title will be set by individual pages */}
                            </h1>
                        </div>

                        {/* Content Container */}
                        <div className="flex-1 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs border border-slate-200 dark:border-slate-700/50 shadow-2xl p-4 md:p-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </BreadcrumbsProvider>
    );
}
