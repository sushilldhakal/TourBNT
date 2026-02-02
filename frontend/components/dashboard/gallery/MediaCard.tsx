/**
 * MediaCard Component
 * 
 * Streamlined media item component with selection and actions.
 * Supports both list and masonry layouts with lazy loading.
 * 
 * Requirements: 4.1, 4.2
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';
import type { MediaItem } from '@/types/gallery';

/**
 * MediaCard props interface
 */
interface MediaCardProps {
    media: MediaItem;
    isSelected: boolean;
    viewMode?: 'list' | 'masonry';
    onSelect: (id: string, modifiers: { shift?: boolean; ctrl?: boolean; meta?: boolean }) => void;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    onClick: (media: MediaItem) => void;
}

/**
 * LazyImage Component for optimized image loading
 */
function LazyImage({
    src,
    alt,
    className
}: {
    src: string;
    alt: string;
    className?: string;
}) {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);

    if (hasError) {
        return (
            <div className={cn('flex items-center justify-center bg-muted', className)}>
                <Icon name="hi/HiX" size={24} className="text-destructive" />
            </div>
        );
    }

    return (
        <div className={cn('relative', className)}>
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                    <Icon name="hi/HiPhotograph" size={32} className="text-muted-foreground" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={cn(
                    'w-full h-full object-cover transition-opacity duration-300',
                    isLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                loading="lazy"
            />
        </div>
    );
}

/**
 * MediaCard Component
 */
export function MediaCard({
    media,
    isSelected,
    viewMode = 'masonry',
    onSelect,
    onDelete,
    onEdit,
    onClick,
}: MediaCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    /**
     * Handle click with range/multi-select support
     */
    const handleClick = (e: React.MouseEvent) => {
        onSelect(media.id, {
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            meta: e.metaKey,
        });
    };

    /**
     * Handle checkbox click (always multi-select)
     */
    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(media.id, {
            shift: e.shiftKey,
            ctrl: e.ctrlKey || true, // Checkbox click is always additive
            meta: e.metaKey,
        });
    };

    /**
     * Handle delete button click
     */
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(media.id);
        }
    };

    /**
     * Handle edit button click
     */
    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(media.id);
        }
    };

    /**
     * Handle view button click
     */
    const handleView = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(media);
    };

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ' ') {
            e.preventDefault();
            onSelect(media.id, { ctrl: true }); // Space bar is additive
        } else if (e.key === 'Enter') {
            e.preventDefault();
            onClick(media);
        }
    };

    /**
     * Format file size
     */
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    /**
     * Check if media is a PDF
     */
    const isPDF = () => {
        return media.resourceType === 'raw' &&
            (media.format === 'pdf' ||
                media.originalFilename?.toLowerCase().endsWith('.pdf') ||
                media.secureUrl.toLowerCase().includes('.pdf'));
    };

    /**
     * Get media type icon
     */
    const getMediaIcon = () => {
        switch (media.resourceType) {
            case 'image':
                return 'hi/HiPhotograph';
            case 'video':
                return 'hi/HiVideoCamera';
            case 'raw':
                // Check if it's a PDF
                if (isPDF()) {
                    return 'hi/HiDocumentText';
                }
                return 'hi/HiFolder';
            default:
                return 'hi/HiFolder';
        }
    };

    /**
     * Render media preview
     */
    const renderPreview = () => {
        if (media.resourceType === 'image') {
            return (
                <LazyImage
                    src={media.secureUrl}
                    alt={media.originalFilename || 'Media item'}
                    className="w-full h-full"
                />
            );
        }

        if (media.resourceType === 'video') {
            return (
                <div className="w-full h-full relative">
                    <video width="320" height="240" controls>
                        <source src={media.secureUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    {/* Video play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                            <Icon name="hi/HiPlay" size={24} className="text-white ml-1" />
                        </div>
                    </div>
                </div>
            );
        }

        if (isPDF()) {
            return (
                <div className="w-full h-full relative bg-white">
                    {/* Try multiple PDF rendering methods for better compatibility */}
                    <div className="w-full h-full relative test for pdf">
                        {/* Method 1: iframe with PDF.js viewer */}
                        <iframe
                            src={`${media.secureUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&zoom=page-fit&view=FitH`}
                            className="w-full h-full border-0 pointer-events-none absolute inset-0"
                            title={`PDF preview: ${media.originalFilename}`}
                            loading="lazy"
                            style={{ display: 'block' }}
                            onError={(e) => {
                                // Hide iframe if it fails to load
                                (e.target as HTMLIFrameElement).style.display = 'none';
                            }}
                        />

                        {/* Method 3: Fallback preview */}
                        {/* <div className="absolute inset-0 flex items-center justify-center bg-gray-50 pointer-events-none">
                            <div className="text-center p-4">
                                <Icon name="hi/HiDocumentText" size={48} className="text-red-500 mx-auto mb-3" />
                                <p className="text-sm text-gray-700 font-medium mb-1">
                                    {media.originalFilename || 'PDF Document'}
                                </p>
                                <p className="text-xs text-gray-500 mb-2">
                                    {formatFileSize(media.bytes)}
                                </p>
                                <p className="text-xs text-gray-400">
                                    Click to view full PDF
                                </p>
                            </div>
                        </div> */}
                    </div>

                    {/* Subtle overlay to indicate it's clickable */}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors pointer-events-none" />
                </div>
            );
        }

        // For other file types, show icon
        return (
            <div className="w-full h-full flex items-center justify-center bg-muted">
                <Icon name={getMediaIcon()} size={48} className="text-muted-foreground" />
            </div>
        );
    };

    return (
        <div
            className={cn(
                'group relative rounded-lg overflow-hidden cursor-pointer transition-all',
                'border-2 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
            )}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="button"
            tabIndex={0}
            aria-label={`${media.originalFilename || 'media item'}. ${isSelected ? 'Selected' : 'Not selected'}.`}
            aria-pressed={isSelected}
            onKeyDown={handleKeyDown}
        >
            {/* Media Preview */}
            <div
                className={cn(
                    'relative w-full',
                    viewMode === 'masonry'
                        ? 'aspect-square'
                        : 'aspect-video'
                )}
            >
                {renderPreview()}

                {/* Media Type Indicator */}
                <div className="absolute top-2 right-2 z-10">
                    <div className="px-2 py-1 bg-black/70 text-white text-xs rounded-full">
                        {media.format ? media.format.toUpperCase() : 'PDF'}
                    </div>
                </div>
            </div>

            {/* Selection Checkbox */}
            <div
                className={cn(
                    'absolute top-2 left-2 z-10 transition-opacity',
                    isSelected || isHovered ? 'opacity-100' : 'opacity-0'
                )}
                onClick={handleCheckboxClick}
            >
                <div
                    className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-background/80 border-border backdrop-blur-sm'
                    )}
                >
                    {isSelected && <Icon name="hi/HiCheck" size={12} />}
                </div>
            </div>

            {/* Hover Actions */}
            <div
                className={cn(
                    'absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition-opacity',
                    isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
            >
                <button
                    onClick={handleView}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                    aria-label="View details"
                >
                    <Icon name="hi/HiEye" size={16} />
                </button>

                {onEdit && media.resourceType === 'image' && (
                    <button
                        onClick={handleEdit}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                        aria-label="Edit media"
                    >
                        <Icon name="hi/HiPencil" size={16} />
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={handleDelete}
                        className="p-2 bg-destructive/80 hover:bg-destructive rounded-full text-white transition-colors"
                        aria-label="Delete media"
                    >
                        <Icon name="hi/HiTrash" size={16} />
                    </button>
                )}
            </div>

            {/* Media Info Overlay */}
            <div
                className={cn(
                    'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 transition-opacity',
                    isHovered ? 'opacity-100' : 'opacity-0'
                )}
            >
                <p className="text-white text-xs truncate font-medium">
                    {media.originalFilename || `${media.publicId}.${media.format}`}
                </p>
                <p className="text-white/70 text-xs">
                    {formatFileSize(media.bytes)}
                    {media.width && media.height && ` • ${media.width}×${media.height}`}
                </p>
            </div>
        </div>
    );
}
