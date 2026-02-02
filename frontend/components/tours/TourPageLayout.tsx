'use client';

import { ReactNode } from 'react';
import { ContentContainer } from '@/components/layout/PublicLayoutClient';

interface TourPageLayoutProps {
    children: ReactNode;
}

/**
 * Wrapper for tour pages. Row is full width; content inside is constrained by ContentContainer.
 */
export function TourPageLayout({ children }: TourPageLayoutProps) {
    return (
        <ContentContainer className="px-4 py-4 sm:py-6 lg:py-8 transition-all duration-300">
            {children}
        </ContentContainer>
    );
}
