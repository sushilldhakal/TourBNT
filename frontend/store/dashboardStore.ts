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

    // UI actions
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

const useDashboardStore = create<DashboardState>()(
    devtools(
        persist(
            (set) => ({
                // Initial state
                sidebarCollapsed: false,

                // Toggle sidebar collapsed state
                toggleSidebar: () => {
                    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
                },

                // Set sidebar collapsed state
                setSidebarCollapsed: (collapsed: boolean) => {
                    set({ sidebarCollapsed: collapsed });
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
