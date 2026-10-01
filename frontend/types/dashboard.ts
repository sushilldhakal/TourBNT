/**
 * Dashboard layout, navigation, and shared component types.
 */

import type { ComponentType } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

// ─── Navigation ─────────────────────────────────────────────────────────────

export interface NavigationItem {
    href?: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    children?: NavigationItem[];
    adminOnly?: boolean;
    /** Personal/customer pages (e.g. My Bookings) that mean nothing in the admin view. */
    hideForAdmin?: boolean;
    partnerOnly?: boolean;
    /** Roles that see this item. Omitted = every signed-in role. */
    roles?: string[];
}

export interface FlatNavItem {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    groupLabel?: string;
}

// ─── DataTable ───────────────────────────────────────────────────────────────

export interface DataTableProps<TData = unknown> {
    data: TData[];
    columns: ColumnDef<TData>[];
    place?: string;
    column?: string;
    initialColumnVisibility?: Record<string, boolean>;
    serverSidePagination?: {
        totalCount: number;
        pageIndex: number;
        pageSize: number;
        onPageChange: (pageIndex: number) => void;
        onPageSizeChange: (pageSize: number) => void;
    };
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export interface DashboardLayoutClientProps {
    children: React.ReactNode;
}

export interface DashboardHeaderProps {
    isCollapsed?: boolean;
    onToggleSidebar?: () => void;
    onLogout?: () => void;
}

export interface DashboardSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    mobileMenuOpen: boolean;
}

// ─── Shared components ───────────────────────────────────────────────────────

export interface PageHeaderProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        href: string;
        icon?: React.ReactNode;
    };
    badge?: {
        label: string;
        variant?: 'default' | 'secondary' | 'outline';
    };
}

export interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        href: string;
        icon?: React.ReactNode;
    };
}

export interface LoadingStateProps {
    type: 'table' | 'cards' | 'form' | 'gallery';
    rows?: number;
    columns?: number;
}

export interface SharedErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
}

export interface ActionItem {
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    variant?: 'default' | 'destructive';
    href?: string;
}

export interface ActionDropdownProps {
    actions: ActionItem[];
}

export interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallback?: React.ReactNode;
    redirectTo?: string;
}
