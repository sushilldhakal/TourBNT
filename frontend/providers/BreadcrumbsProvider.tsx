'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

/**
 * Breadcrumbs Context Provider
 * Migrated from dashboard/src/Provider/BreadcrumbsProvider.tsx
 * Manages breadcrumb state for dashboard navigation
 */

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsContextType {
    breadcrumbs: BreadcrumbItem[];
    setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
    addBreadcrumb: (breadcrumb: BreadcrumbItem) => void;
    clearBreadcrumbs: () => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextType | undefined>(undefined);

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

    const addBreadcrumb = (breadcrumb: BreadcrumbItem) => {
        setBreadcrumbs((prev) => [...prev, breadcrumb]);
    };

    const clearBreadcrumbs = () => {
        setBreadcrumbs([]);
    };

    return (
        <BreadcrumbsContext.Provider
            value={{
                breadcrumbs,
                setBreadcrumbs,
                addBreadcrumb,
                clearBreadcrumbs,
            }}
        >
            {children}
        </BreadcrumbsContext.Provider>
    );
}

export function useBreadcrumbs() {
    const context = useContext(BreadcrumbsContext);
    if (context === undefined) {
        throw new Error('useBreadcrumbs must be used within a BreadcrumbsProvider');
    }
    return context;
}
