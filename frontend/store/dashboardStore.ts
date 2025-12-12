import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { clearAuthData } from '@/lib/auth/authUtils';

/**
 * Dashboard Store
 * Migrated and enhanced from dashboard/src/store/store.ts
 * Manages dashboard-specific state including auth tokens and UI state
 */

export interface User {
    _id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
}

export interface DashboardState {
    // Auth state
    token: string;
    refreshToken: string;
    user: User | null;

    // UI state
    sidebarCollapsed: boolean;

    // Auth actions
    setToken: (token: string, refreshToken?: string) => void;
    setUser: (user: User | null) => void;
    clearAuth: () => void;
    getToken: () => string;

    // UI actions
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

const useDashboardStore = create<DashboardState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                token: typeof window !== 'undefined' ? Cookies.get('token') || '' : '',
                refreshToken: typeof window !== 'undefined' ? Cookies.get('refreshToken') || '' : '',
                user: null,
                sidebarCollapsed: false,

                // Set authentication tokens
                setToken: (token: string, refreshToken?: string) => {
                    set({ token, refreshToken: refreshToken || get().refreshToken });

                    // Store in cookies
                    if (typeof window !== 'undefined') {
                        Cookies.set('token', token, {
                            expires: 7, // 7 days
                            path: '/',
                            sameSite: 'lax',
                            secure: process.env.NODE_ENV === 'production',
                        });

                        if (refreshToken) {
                            Cookies.set('refreshToken', refreshToken, {
                                expires: 30, // 30 days
                                path: '/',
                                sameSite: 'lax',
                                secure: process.env.NODE_ENV === 'production',
                            });
                        }
                    }
                },

                // Set user data
                setUser: (user: User | null) => {
                    set({ user });
                },

                // Clear all auth data
                clearAuth: () => {
                    set({ token: '', refreshToken: '', user: null });
                    clearAuthData();
                },

                // Get token (with fallback to cookie)
                getToken: () => {
                    const state = get();
                    if (state.token) return state.token;

                    // Fallback to cookie if state is empty
                    if (typeof window !== 'undefined') {
                        const cookieToken = Cookies.get('token');
                        if (cookieToken) {
                            set({ token: cookieToken });
                            return cookieToken;
                        }
                    }
                    return '';
                },

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
                // Only persist UI preferences, not sensitive auth data
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
export const useToken = () => useDashboardStore((state) => state.token);
export const useUser = () => useDashboardStore((state) => state.user);
export const useSidebarCollapsed = () => useDashboardStore((state) => state.sidebarCollapsed);
