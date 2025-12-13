/**
 * MasonryGrid Component
 * 
 * Displays media items in a Pinterest-style masonry grid layout.
 * Provides better visual layout for images of varying aspect ratios.
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
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
                'relative rounded-lg overflow-hidden',
                'border-2 border-dashed border-primary bg-muted/50'
            )}
        >
            {/* Preview or icon */}
            <div className="relative w-full aspect-square flex items-center justify-center">
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
 * MasonryGrid Component
 * Main masonry grid component with responsive layout and infinite scroll
 * Uses CSS columns for true Pinterest-style masonry layout
 */
export function MasonryGrid({
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

    /**
     * Infinite scroll implementation using Intersection Observer
     * Debounced to prevent excessive calls
     */
    const handleIntersection = React.useCallback(
        debounce((entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;

            if (entry.isIntersecting && hasMore && !isFetchingMore) {
                onLoadMore();
            }
        }, 150),
        [hasMore, isFetchingMore, onLoadMore]
    );

    /**
     * Set up Intersection Observer for infinite scroll
     */
    useEffect(() => {
        const trigger = scrollTriggerRef.current;
        if (!trigger) return;

        observerRef.current = new IntersectionObserver(
            (entries) => handleIntersection(entries),
            {
                root: null,
                rootMargin: '800px',
                threshold: 0.1,
            }
        );

        observerRef.current.observe(trigger);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [handleIntersection]);

    /**
     * Handle click on media item
     */
    const handleMediaClick = (media: any) => {
        onSelect(media.id, false);
    };

    return (
        <div className="w-full" ref={gridRef}>
            {/* True Masonry Layout using CSS columns */}
            <div
                className="p-4"
                style={{
                    columnCount: 'auto',
                    columnWidth: '250px',
                    columnGap: '1rem',
                }}
            >
                {/* Uploading files */}
                {uploadingFiles.map((file, index) => (
                    <div
                        key={`uploading-${index}`}
                        style={{
                            breakInside: 'avoid',
                            marginBottom: '1rem',
                            display: 'inline-block',
                            width: '100%',
                        }}
                    >
                        <UploadingCard file={file} />
                    </div>
                ))}

                {/* Media items */}
                {mediaItems.map((media) => (
                    <div
                        key={media.id}
                        style={{
                            breakInside: 'avoid',
                            marginBottom: '1rem',
                            display: 'inline-block',
                            width: '100%',
                        }}
                    >
                        <MediaCard
                            media={media}
                            isSelected={selectedIds.has(media.id)}
                            onSelect={onSelect}
                            onDelete={onDelete}
                            onClick={handleMediaClick}
                        />
                    </div>
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
