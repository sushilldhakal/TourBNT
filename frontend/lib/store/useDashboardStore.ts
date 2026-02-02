import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Dashboard Store
 * Manages dashboard-specific UI state
 * Auth state is now managed by useUserStore
 */

export interface DashboardState {
    // UI state
    sidebarCollapsed: boolean;
    mobileMenuOpen: boolean;

    // UI actions
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setMobileMenuOpen: (open: boolean) => void;
    toggleMobileMenu: () => void;
}

const useDashboardStore = create<DashboardState>()(
    devtools(
        persist(
            (set) => ({
                // Initial state
                sidebarCollapsed: false,
                mobileMenuOpen: false,

                // Toggle sidebar collapsed state
                toggleSidebar: () => {
                    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
                },

                // Set sidebar collapsed state
                setSidebarCollapsed: (collapsed: boolean) => {
                    set({ sidebarCollapsed: collapsed });
                },

                // Mobile menu state
                setMobileMenuOpen: (open: boolean) => {
                    set({ mobileMenuOpen: open });
                },

                toggleMobileMenu: () => {
                    set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }));
                },
            }),
            {
                name: 'dashboard-storage',
                // Persist UI preferences
                partialize: (state) => ({
                    sidebarCollapsed: state.sidebarCollapsed,
                }),
            }
        ),
        {
            name: 'DashboardStore',
            enabled: process.env.NODE_ENV === 'development',
        }
    )
);

export default useDashboardStore;

// Selectors for optimized re-renders
export const useSidebarCollapsed = () => useDashboardStore((state) => state.sidebarCollapsed);
