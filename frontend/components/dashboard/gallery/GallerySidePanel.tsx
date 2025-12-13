/**
 * GallerySidePanel Component
 * 
 * Conditional panel rendering wrapper that shows:
 * - MediaDetailPanel when single item is selected
 * - BulkActionsPanel when multiple items are selected
 * - Nothing when no items are selected
 * 
 * Handles responsive layout (full screen on mobile)
 * Requirements: 4.1, 6.1, 11.4
 */

'use client';

import React from 'react';
import { MediaDetailPanelEditable } from './MediaDetailPanelEditable';
import { BulkActionsPanel } from './BulkActionsPanel';
import { MediaItem } from './types';
import { cn } from '@/lib/utils';

interface GallerySidePanelProps {
    selectedMedia: MediaItem[];
    onClose: () => void;
    onDelete: (id: string) => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
    onCopyUrl: (url: string) => void;
    isDeleting: boolean;
}

/**
 * GallerySidePanel Component
 * 
 * Conditionally renders the appropriate panel based on selection state:
 * - No selection: Hidden
 * - Single selection: MediaDetailPanel
 * - Multiple selection: BulkActionsPanel
 */
export function GallerySidePanel({
    selectedMedia,
    onClose,
    onDelete,
    onBulkDelete,
    onClearSelection,
    onCopyUrl,
    isDeleting,
}: GallerySidePanelProps) {
    const selectedCount = selectedMedia.length;
    const panelRef = React.useRef<HTMLDivElement>(null);
    const previousFocusRef = React.useRef<HTMLElement | null>(null);

    /**
     * Focus management: Store and restore focus
     */
    React.useEffect(() => {
        if (selectedCount > 0) {
            // Store the currently focused element
            previousFocusRef.current = document.activeElement as HTMLElement;

            // Focus the panel after a short delay to ensure it's rendered
            setTimeout(() => {
                const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                firstFocusable?.focus();
            }, 100);
        } else if (previousFocusRef.current) {
            // Return focus when panel closes
            previousFocusRef.current.focus();
        }
    }, [selectedCount]);

    // Hide panel when no items are selected
    if (selectedCount === 0) {
        return null;
    }

    // Show MediaDetailPanel for single selection
    if (selectedCount === 1) {
        return (
            <div
                ref={panelRef}
                className={cn(
                    // Desktop: Fixed width sidebar
                    'hidden lg:block lg:w-96 lg:flex-shrink-0',
                    // Mobile: Full screen overlay
                    'fixed inset-0 z-50 bg-background',
                    'lg:relative lg:z-auto'
                )}
            >
                <MediaDetailPanelEditable
                    media={selectedMedia[0]}
                    onClose={onClose}
                    onDelete={onDelete}
                    onCopyUrl={onCopyUrl}
                />
            </div>
        );
    }

    // Show BulkActionsPanel for multiple selection
    return (
        <div
            ref={panelRef}
            className={cn(
                // Desktop: Fixed width sidebar
                'hidden lg:block lg:w-96 lg:flex-shrink-0',
                // Mobile: Full screen overlay
                'fixed inset-0 z-50 bg-background',
                'lg:relative lg:z-auto'
            )}
        >
            <BulkActionsPanel
                selectedCount={selectedCount}
                onBulkDelete={onBulkDelete}
                onClearSelection={onClearSelection}
                isDeleting={isDeleting}
            />
        </div>
    );
}

/**
 * Mobile version of the side panel
 * Shows as a full-screen overlay on mobile devices
 */
export function MobileGallerySidePanel({
    selectedMedia,
    onClose,
    onDelete,
    onBulkDelete,
    onClearSelection,
    onCopyUrl,
    isDeleting,
}: GallerySidePanelProps) {
    const selectedCount = selectedMedia.length;
    const panelRef = React.useRef<HTMLDivElement>(null);
    const previousFocusRef = React.useRef<HTMLElement | null>(null);

    /**
     * Focus trap for mobile panel
     */
    React.useEffect(() => {
        if (selectedCount > 0) {
            // Store the currently focused element
            previousFocusRef.current = document.activeElement as HTMLElement;

            // Focus the first focusable element in the panel
            setTimeout(() => {
                const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                firstFocusable?.focus();
            }, 100);

            // Trap focus within the panel
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Tab' && panelRef.current) {
                    const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement?.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement?.focus();
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);

            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                // Return focus when panel closes
                if (previousFocusRef.current) {
                    previousFocusRef.current.focus();
                }
            };
        }
    }, [selectedCount]);

    // Hide panel when no items are selected
    if (selectedCount === 0) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div ref={panelRef} className="fixed inset-0 z-50 lg:hidden">
                {selectedCount === 1 ? (
                    <MediaDetailPanelEditable
                        media={selectedMedia[0]}
                        onClose={onClose}
                        onDelete={onDelete}
                        onCopyUrl={onCopyUrl}
                    />
                ) : (
                    <BulkActionsPanel
                        selectedCount={selectedCount}
                        onBulkDelete={onBulkDelete}
                        onClearSelection={onClearSelection}
                        isDeleting={isDeleting}
                    />
                )}
            </div>
        </>
    );
}
