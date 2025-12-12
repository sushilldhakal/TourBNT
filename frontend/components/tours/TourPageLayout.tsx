'use client';

import { useLayout } from '@/providers/LayoutProvider';
import { ReactNode } from 'react';

interface TourPageLayoutProps {
    children: ReactNode;
}

/**
 * Client component wrapper to handle layout toggle
 * This allows the parent server component to respect the layout setting
 */
export function TourPageLayout({ children }: TourPageLayoutProps) {
    const { isFullWidth } = useLayout();

    return (
        <div className={`${isFullWidth ? 'w-full px-4' : 'mx-auto max-w-7xl px-4'} py-4 sm:py-6 lg:py-8 transition-all duration-300`}>
            {children}
        </div>
    );
}
