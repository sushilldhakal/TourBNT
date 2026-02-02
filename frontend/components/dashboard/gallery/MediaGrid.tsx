/**
 * MediaGrid Component
 * 
 * Unified component supporting both list and masonry view modes.
 * Displays media items with infinite scroll and responsive layouts.
 * 
 * Requirements: 3.2, 3.3, 6.1
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { debounce } from '@/lib/utils/debounce';
import Icon from '@/components/Icon';

// Import the new simplified components
import { MediaCard } from './MediaCard';
import { MediaSkeleton } from './MediaSkeleton';
import type { MediaItem } from '@/types/gallery';

/**
 * MediaGrid props interface
 */
interface MediaGridProps {
    items: MediaItem[];
    viewMode: 'list' | 'masonry';
    selectedIds: Set<string>;
    onSelect: (id: string, modifiers: { shift?: boolean; ctrl?: boolean; meta?: boolean }) => void;
    onDelete?: (id: string) => void;
    onClick?: (media: MediaItem) => void;
    isLoading: boolean;
    hasMore: boolean;
    isFetchingMore: boolean;
    onLoadMore: () => void;
}

/**
 * LazyImage Component for optimized image loading
 */
function LazyImage({
    src,
    alt,
    className,
    placeholder = 'hi/HiPhotograph'
}: {
    src: string;
    alt: string;
    className?: string;
    placeholder?: string;
}) {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [isInView, setIsInView] = React.useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.unobserve(img);
                }
            },
            {
                rootMargin: '50px', // Start loading 50px before the image comes into view
                threshold: 0.1,
            }
        );

        observer.observe(img);

        return () => {
            observer.disconnect();
        };
    }, []);

    return (
        <div ref={imgRef} className={cn('relative', className)}>
            {!isInView || !isLoaded ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Icon name={placeholder} size={32} className="text-muted-foreground" />
                </div>
            ) : null}

            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    className={cn(
                        'w-full h-full object-cover transition-opacity duration-300',
                        isLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoad={() => setIsLoaded(true)}
                    loading="lazy"
                />
            )}
        </div>
    );
}

/**
 * MediaGrid Component
 * Unified grid component supporting both list and masonry layouts
 */
export function MediaGrid({
    items,
    viewMode,
    selectedIds,
    onSelect,
    onDelete,
    onClick,
    isLoading,
    hasMore,
    isFetchingMore,
    onLoadMore,
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
                rootMargin: '800px', // Start loading 800px before reaching the trigger
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
     */
    const handleMediaClick = (media: MediaItem, e?: React.MouseEvent) => {
        if (onClick) {
            onClick(media);
        } else {
            // Pass modifier keys for range/multi-select
            onSelect(media.id, {
                shift: e?.shiftKey || false,
                ctrl: e?.ctrlKey || false,
                meta: e?.metaKey || false,
            });
        }
    };

    /**
     * Get number of columns based on screen width for keyboard navigation
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
     */
    const handleGridKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (items.length === 0 || viewMode === 'list') return;

            const columns = getColumnsCount();
            let newIndex = focusedIndex;

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    newIndex = Math.min(focusedIndex + 1, items.length - 1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    newIndex = Math.max(focusedIndex - 1, 0);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    newIndex = Math.min(focusedIndex + columns, items.length - 1);
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
                    newIndex = items.length - 1;
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
        [focusedIndex, items.length, getColumnsCount, viewMode]
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
        if (focusedIndex >= items.length && items.length > 0) {
            setFocusedIndex(items.length - 1);
        }
    }, [items.length, focusedIndex]);

    // Render list view
    if (viewMode === 'list') {
        return (
            <div className="w-full" ref={gridRef}>
                <div className="p-4 space-y-3">
                    {items.map((media) => {
                        // Check if this is a PDF
                        const isPDF = media.resourceType === 'raw' &&
                            (media.format === 'pdf' ||
                                media.originalFilename?.toLowerCase().endsWith('.pdf') ||
                                media.secureUrl.toLowerCase().includes('.pdf'));

                        return (
                            <div
                                key={media.id}
                                className={cn(
                                    'flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer',
                                    selectedIds.has(media.id) && 'bg-accent border-primary',
                                    isPDF && 'min-h-[120px]' // Taller for PDFs
                                )}
                                onClick={(e) => handleMediaClick(media, e)}
                                role="button"
                                tabIndex={0}
                            >
                                {/* Checkbox */}
                                <div className="flex-shrink-0 pt-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelect(media.id, {
                                                shift: e.shiftKey,
                                                ctrl: e.ctrlKey,
                                                meta: e.metaKey,
                                            });
                                        }}
                                        className={cn(
                                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                                            selectedIds.has(media.id)
                                                ? 'bg-primary border-primary text-primary-foreground'
                                                : 'border-muted-foreground hover:border-primary'
                                        )}
                                        aria-label={selectedIds.has(media.id) ? 'Deselect item' : 'Select item'}
                                    >
                                        {selectedIds.has(media.id) && (
                                            <Icon name="hi/HiCheck" size={14} />
                                        )}
                                    </button>
                                </div>

                                {/* Thumbnail - larger for PDFs */}
                                <div className={cn(
                                    'rounded-lg overflow-hidden bg-muted flex-shrink-0',
                                    isPDF ? 'w-24 h-32' : 'w-16 h-16' // Larger for PDFs
                                )}>
                                    {media.resourceType === 'image' ? (
                                        <LazyImage
                                            src={media.secureUrl}
                                            alt={media.originalFilename || 'Media'}
                                            className="w-full h-full"
                                            placeholder="hi/HiPhotograph"
                                        />
                                    ) : isPDF ? (
                                        // PDF preview in list view
                                        <div className="w-full h-full relative bg-white">
                                            <iframe
                                                src={`${media.secureUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&zoom=page-fit`}
                                                className="w-full h-full border-0 pointer-events-none"
                                                title={`PDF preview: ${media.originalFilename}`}
                                                loading="lazy"
                                            />
                                            {/* PDF badge */}
                                            <div className="absolute top-1 left-1 bg-red-600 text-white px-1 py-0.5 text-xs font-bold rounded">
                                                PDF
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Icon
                                                name={media.resourceType === 'video' ? 'hi/HiVideoCamera' : 'hi/HiDocumentText'}
                                                size={24}
                                                className="text-muted-foreground"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium truncate text-base">
                                        {media.originalFilename || `${media.publicId}.${media.format}`}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {media.format.toUpperCase()} • {(media.bytes / 1024).toFixed(1)} KB
                                        {media.width && media.height && ` • ${media.width}×${media.height}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(media.createdAt).toLocaleDateString()}
                                    </p>
                                    {/* Show tags if available */}
                                    {media.tags && media.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {media.tags.slice(0, 3).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-muted text-xs rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {media.tags.length > 3 && (
                                                <span className="px-2 py-1 bg-muted text-xs rounded-full">
                                                    +{media.tags.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {onDelete && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(media.id);
                                            }}
                                            className="p-1 rounded hover:bg-destructive/10 text-destructive"
                                            title="Delete"
                                        >
                                            <Icon name="hi/HiTrash" size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Loading skeletons for list view */}
                    {isLoading && (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="flex items-start gap-4 p-4">
                                    <div className="w-24 h-32 rounded-lg bg-muted animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                                        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                                        <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Infinite scroll trigger for list view */}
                {hasMore && !isLoading && (
                    <div
                        ref={scrollTriggerRef}
                        className="w-full py-8 flex items-center justify-center"
                    >
                        {isFetchingMore && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                                <span className="text-sm">Loading more...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Render masonry view (row-based grid)
    return (
        <div className="w-full" ref={gridRef}>
            {/* Row-based Grid Layout using CSS Grid */}
            <div className="p-4">
                <div
                    className="grid gap-4 auto-rows-max"
                    style={{
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(250px, 100%), 1fr))',
                    }}
                >
                    {/* Media items */}
                    {items.map((media) => (
                        <div key={media.id} className="w-full">
                            <MediaCard
                                media={media}
                                isSelected={selectedIds.has(media.id)}
                                onSelect={onSelect}
                                onDelete={onDelete}
                                onClick={onClick ? () => onClick(media) : () => handleMediaClick(media)}
                                viewMode="masonry"
                            />
                        </div>
                    ))}

                    {/* Loading skeletons for masonry view */}
                    {isLoading && <MediaSkeleton count={12} />}
                </div>
            </div>

            {/* Infinite scroll trigger for masonry view */}
            {hasMore && !isLoading && (
                <div
                    ref={scrollTriggerRef}
                    className="w-full py-8 flex items-center justify-center"
                >
                    {isFetchingMore && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                            <span className="text-sm">Loading more...</span>
                        </div>
                    )}
                </div>
            )}

            {/* No more items indicator */}
            {!hasMore && items.length > 0 && !isLoading && (
                <div className="w-full py-8 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                        No more items to load
                    </p>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && items.length === 0 && (
                <div className="w-full py-16 flex flex-col items-center justify-center gap-4">
                    <div className="opacity-50">
                        <Icon name="hi/HiFolder" size={64} className="text-muted-foreground" />
                    </div>
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