'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { TourProvider } from '@/providers/TourProvider';
import { getTourWithDefaults } from '@/lib/utils/defaultTourValues';

/**
 * TourEditorWrapper Component
 * 
 * Wraps the tour editor with TourProvider, automatically detecting
 * whether we're in add or edit mode based on the current route.
 * 
 * Usage:
 * - For add mode: Place in /dashboard/tours/add/page.tsx
 * - For edit mode: Place in /dashboard/tours/edit/[id]/page.tsx
 * 
 * The wrapper will:
 * - Detect add vs edit mode from the route
 * - Pass appropriate props to TourProvider
 * - Provide default values for add mode
 * - Enable data fetching for edit mode
 */

interface TourEditorWrapperProps {
    children: React.ReactNode;
}

export function TourEditorWrapper({ children }: TourEditorWrapperProps) {
    const params = useParams();

    // Detect if we're in edit mode by checking for an ID param
    const isEditing = !!params?.id;

    // Get default values for add mode
    const defaultValues = !isEditing ? getTourWithDefaults() : undefined;

    return (
        <TourProvider
            isEditing={isEditing}
            defaultValues={defaultValues as any}
        >
            {children}
        </TourProvider>
    );
}
