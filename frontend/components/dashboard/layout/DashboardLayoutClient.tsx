'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { BreadcrumbsProvider } from '@/providers/BreadcrumbsProvider';
import useDashboardStore from '@/lib/store/useDashboardStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useLayout } from '@/providers/LayoutProvider';
import type { DashboardLayoutClientProps } from '@/types/dashboard';

/**
 * Dashboard Layout Client Component
 * Migrated from dashboard/src/layouts/DashboardLayout.tsx
 * Handles client-side layout rendering and state
 */
export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, toggleMobileMenu, setMobileMenuOpen } = useDashboardStore();
    const { logout } = useAuth();
    const { isFullWidth } = useLayout();
    // Messaging is a fixed-height app view, not a standard page: it keeps its own sizing.
    const isMessagePage = pathname?.startsWith('/dashboard/message') ?? false;


    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const toggleSidebar = () => {
        // On mobile, toggle mobile menu; on desktop, toggle sidebar collapse
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            toggleMobileMenu();
        } else {
            setSidebarCollapsed(!sidebarCollapsed);
        }
    };

    // Close mobile menu when window is resized to desktop size
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768 && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mobileMenuOpen, setMobileMenuOpen]);

    // Auto-collapse sidebar when width is 768px–1024px (more room for dashboard).
    // Only collapse when *entering* that range so user can still expand and it stays expanded.
    const prevWidthRef = useRef<number | null>(null);
    useEffect(() => {
        const inTabletRange = (width: number) => width >= 768 && width < 1024;
        const syncSidebarForWidth = () => {
            const w = window.innerWidth;
            const prev = prevWidthRef.current;
            const nowInTabletRange = inTabletRange(w);
            const justEnteredTabletRange = prev !== null && !inTabletRange(prev) && nowInTabletRange;
            if (prev === null) {
                // Initial load: collapse if already in tablet range
                if (nowInTabletRange) setSidebarCollapsed(true);
            } else if (justEnteredTabletRange) {
                setSidebarCollapsed(true);
            }
            prevWidthRef.current = w;
        };

        syncSidebarForWidth();
        window.addEventListener('resize', syncSidebarForWidth);
        return () => window.removeEventListener('resize', syncSidebarForWidth);
    }, [setSidebarCollapsed]);

    return (
        <BreadcrumbsProvider>
            <div
                data-dashboard-layout={isFullWidth ? 'full' : 'boxed'}
                className="flex min-h-screen w-full min-w-0 bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
            >
                {/* Mobile Overlay */}
                {mobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={toggleMobileMenu}
                    />
                )}

                {/* Sidebar */}
                <DashboardSidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={toggleSidebar}
                    mobileMenuOpen={mobileMenuOpen}
                />

                {/* Main Content */}
                <div
                    className={cn(
                        'flex flex-1 flex-col transition-all duration-300 min-w-0',
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
                    <main className="flex flex-1 min-w-0">
                        {/* Shadcn-style: one wrapper controls width */}
                        <div
                            data-dashboard-shell
                            className={cn(
                                'flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 transition-[max-width] duration-300 min-w-0',
                                isFullWidth || isMessagePage ? 'w-full max-w-none' : 'w-full max-w-7xl mx-auto'
                            )}
                        >
                            {/* Content Container */}
                            <div
                                data-dashboard-page
                                data-dashboard-fluid={isMessagePage ? '' : undefined}
                                className="w-full min-w-0 flex-1 rounded-xl"
                            >
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </BreadcrumbsProvider>
    );
}
