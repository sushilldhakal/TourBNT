/**
 * MediaGrid Component
 * 
 * Displays media items in a responsive grid with infinite scroll.
 * Implements responsive breakpoints and progressive loading.
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { MediaGridProps } from './types';
import { MediaCard } from './MediaCard';
import { MediaSkeleton } from './MediaSkeleton';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';
import { debounce } from '@/lib/utils/debounce';

/**
 * UploadingCard Component
 * Shows a card for files currently being uploaded (optimistic UI)
 */
function UploadingCard({ file }: { file: File }) {
    const [preview, setPreview] = React.useState<string | null>(null);

    useEffect(() => {
        // Create preview for image files
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }

        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [file]);

    const getFileIcon = () => {
        if (file.type.startsWith('image/')) return 'lu:LuImage';
        if (file.type.startsWith('video/')) return 'lu:LuVideo';
        if (file.type === 'application/pdf') return 'lu:LuFileText';
        return 'lu:LuFile';
    };

    return (
        <div
            className={cn(
                'relative aspect-square rounded-lg overflow-hidden',
                'border-2 border-dashed border-primary bg-muted/50'
            )}
        >
            {/* Preview or icon */}
            <div className="relative w-full h-full flex items-center justify-center">
                {preview ? (
                    <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-full object-cover opacity-50"
                    />
                ) : (
                    <Icon name={getFileIcon()} size={48} className="text-muted-foreground opacity-50" />
                )}
            </div>

            {/* Upload progress overlay */}
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <div className="animate-spin">
                    <Icon name="lu:LuLoader2" size={32} className="text-white" />
                </div>
                <p className="text-white text-sm font-medium">Uploading...</p>
            </div>

            {/* File info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-white text-xs truncate font-medium">
                    {file.name}
                </p>
            </div>
        </div>
    );
}

/**
 * MediaGrid Component
 * Main grid component with responsive layout and infinite scroll
 */
export function MediaGrid({
    mediaItems,
    selectedIds,
    onSelect,
    onDelete,
    isLoading,
    isFetchingMore,
    hasMore,
    onLoadMore,
    uploadingFiles,
}: MediaGridProps) {
    const scrollTriggerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);

    /**
     * Infinite scroll implementation using Intersection Observer
     * Triggers onLoadMore when the trigger element comes into view
     * Debounced to prevent excessive calls
     */
    const handleIntersection = useCallback(
        debounce((entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;

            // Load more when:
            // 1. The trigger is visible
            // 2. We have more items to load
            // 3. We're not already fetching
            if (entry.isIntersecting && hasMore && !isFetchingMore) {
                onLoadMore();
            }
        }, 150), // Debounce by 150ms to prevent rapid calls
        [hasMore, isFetchingMore, onLoadMore]
    );

    /**
     * Set up Intersection Observer for infinite scroll
     * Optimized with larger root margin for smoother loading
     */
    useEffect(() => {
        const trigger = scrollTriggerRef.current;
        if (!trigger) return;

        // Create observer with optimized settings
        observerRef.current = new IntersectionObserver(
            (entries) => handleIntersection(entries),
            {
                root: null, // viewport
                rootMargin: '800px', // Start loading 800px before reaching the trigger (increased for smoother UX)
                threshold: 0.1,
            }
        );

        observerRef.current.observe(trigger);

        // Cleanup
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [handleIntersection]);

    /**
     * Handle click on media item
     * Opens detail panel for single selection
     */
    const handleMediaClick = (media: any) => {
        // For now, just select the item
        // Detail panel will be handled by parent component
        onSelect(media.id, false);
    };

    /**
     * Get number of columns based on screen width
     * This matches the grid-cols-* classes in the grid
     */
    const getColumnsCount = useCallback(() => {
        if (typeof window === 'undefined') return 6;
        const width = window.innerWidth;
        if (width < 640) return 2; // mobile
        if (width < 768) return 3; // sm
        if (width < 1024) return 4; // md
        if (width < 1280) return 5; // lg
        return 6; // xl and above
    }, []);

    /**
     * Handle arrow key navigation in grid
     * Left/Right: Move horizontally
     * Up/Down: Move vertically based on grid columns
     */
    const handleGridKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (mediaItems.length === 0) return;

            const columns = getColumnsCount();
            let newIndex = focusedIndex;

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    newIndex = Math.min(focusedIndex + 1, mediaItems.length - 1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    newIndex = Math.max(focusedIndex - 1, 0);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    newIndex = Math.min(focusedIndex + columns, mediaItems.length - 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    newIndex = Math.max(focusedIndex - columns, 0);
                    break;
                case 'Home':
                    e.preventDefault();
                    newIndex = 0;
                    break;
                case 'End':
                    e.preventDefault();
                    newIndex = mediaItems.length - 1;
                    break;
                default:
                    return;
            }

            if (newIndex !== focusedIndex) {
                setFocusedIndex(newIndex);
                // Focus the card element
                const cards = gridRef.current?.querySelectorAll('[role="button"]');
                if (cards && cards[newIndex]) {
                    (cards[newIndex] as HTMLElement).focus();
                }
            }
        },
        [focusedIndex, mediaItems.length, getColumnsCount]
    );

    /**
     * Set up keyboard navigation
     */
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;

        grid.addEventListener('keydown', handleGridKeyDown as any);

        return () => {
            grid.removeEventListener('keydown', handleGridKeyDown as any);
        };
    }, [handleGridKeyDown]);

    /**
     * Update focused index when items change
     */
    useEffect(() => {
        if (focusedIndex >= mediaItems.length && mediaItems.length > 0) {
            setFocusedIndex(mediaItems.length - 1);
        }
    }, [mediaItems.length, focusedIndex]);

    return (
        <div className="w-full" ref={gridRef}>
            {/* Responsive Grid Layout
                Mobile: 2 columns (grid-cols-2)
                Tablet: 3-4 columns (sm:grid-cols-3 md:grid-cols-4)
                Desktop: 5-6 columns (lg:grid-cols-5 xl:grid-cols-6)
            */}
            <div
                className={cn(
                    'grid gap-4 p-4',
                    'grid-cols-2', // Mobile: 2 columns
                    'sm:grid-cols-3', // Small tablet: 3 columns
                    'md:grid-cols-4', // Tablet: 4 columns
                    'lg:grid-cols-5', // Desktop: 5 columns
                    'xl:grid-cols-6', // Large desktop: 6 columns
                    '2xl:grid-cols-6' // Extra large: 6 columns
                )}
            >
                {/* Uploading files (optimistic UI) */}
                {uploadingFiles.map((file, index) => (
                    <UploadingCard key={`uploading-${index}-${file.name}`} file={file} />
                ))}

                {/* Media items */}
                {mediaItems.map((media) => (
                    <MediaCard
                        key={media.id}
                        media={media}
                        isSelected={selectedIds.has(media.id)}
                        onSelect={onSelect}
                        onDelete={onDelete}
                        onClick={handleMediaClick}
                    />
                ))}

                {/* Loading skeletons */}
                {isLoading && <MediaSkeleton count={12} />}
            </div>

            {/* Infinite scroll trigger */}
            {hasMore && !isLoading && (
                <div
                    ref={scrollTriggerRef}
                    className="w-full py-8 flex items-center justify-center"
                >
                    {isFetchingMore && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="animate-spin">
                                <Icon name="lu:LuLoader2" size={20} />
                            </div>
                            <span className="text-sm">Loading more...</span>
                        </div>
                    )}
                </div>
            )}

            {/* No more items indicator */}
            {!hasMore && mediaItems.length > 0 && !isLoading && (
                <div className="w-full py-8 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                        No more items to load
                    </p>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && mediaItems.length === 0 && uploadingFiles.length === 0 && (
                <div className="w-full py-16 flex flex-col items-center justify-center gap-4">
                    <Icon name="lu:LuImageOff" size={64} className="text-muted-foreground" />
                    <div className="text-center">
                        <h3 className="text-lg font-semibold mb-1">No media found</h3>
                        <p className="text-sm text-muted-foreground">
                            Upload some files to get started
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
