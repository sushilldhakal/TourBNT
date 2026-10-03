/**
 * MediaLightbox Component
 * 
 * Full-screen image viewer with navigation, zoom, and metadata display.
 * Supports images, videos, and PDFs with keyboard navigation and touch gestures.
 * 
 * Requirements: 8.1, 8.2, 8.4, 8.6, 7.2
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/Icon';
import { cn } from '@/lib/utils';
import type { MediaItem, MediaLightboxProps } from '@/types/gallery';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

export type { MediaLightboxProps } from '@/types/gallery';

/**
 * MediaLightbox component
 * 
 * Provides full-screen media viewing with navigation controls,
 * metadata display, and keyboard/touch support.
 */
export function MediaLightbox({
    open,
    onOpenChange,
    items,
    currentIndex,
    onIndexChange,
}: MediaLightboxProps) {
    const [isZoomed, setIsZoomed] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    
    // Drag state for panning zoomed images
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

    // Drag state for navigation between images
    const [isNavigating, setIsNavigating] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [navigationStartX, setNavigationStartX] = useState(0);

    const currentItem = items[currentIndex];
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < items.length - 1;

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;
    const dragThreshold = 100; // Minimum drag distance to trigger navigation

    // Format file size for display
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format date for display
    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Unknown date';
        }
    };

    // Navigation functions
    const goToPrevious = useCallback(() => {
        if (hasPrevious) {
            onIndexChange(currentIndex - 1);
            setIsZoomed(false);
        }
    }, [currentIndex, hasPrevious, onIndexChange]);

    const goToNext = useCallback(() => {
        if (hasNext) {
            onIndexChange(currentIndex + 1);
            setIsZoomed(false);
        }
    }, [currentIndex, hasNext, onIndexChange]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!open) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    goToPrevious();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    goToNext();
                    break;
                case 'Escape':
                    e.preventDefault();
                    onOpenChange(false);
                    break;
                case ' ':
                    e.preventDefault();
                    setIsZoomed(prev => !prev);
                    break;
            }
        };

        if (open) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [open, goToPrevious, goToNext, onOpenChange]);

    // Reset zoom and position when item changes
    useEffect(() => {
        setIsZoomed(false);
        setImagePosition({ x: 0, y: 0 });
        setIsDragging(false);
    }, [currentIndex]);

    // Auto-scroll thumbnail into view
    useEffect(() => {
        if (thumbnailRefs.current[currentIndex]) {
            thumbnailRefs.current[currentIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [currentIndex]);

    // Navigation drag handlers (horizontal swipe to change images)
    const handleNavigationDragStart = (clientX: number) => {
        if (isZoomed) return; // Don't navigate while zoomed
        setIsNavigating(true);
        setNavigationStartX(clientX);
        setDragOffset(0);
    };

    const handleNavigationDragMove = (clientX: number) => {
        if (!isNavigating || isZoomed) return;
        const offset = clientX - navigationStartX;
        
        // Limit drag if at boundaries
        if ((offset > 0 && !hasPrevious) || (offset < 0 && !hasNext)) {
            setDragOffset(offset * 0.3); // Rubber band effect
        } else {
            setDragOffset(offset);
        }
    };

    const handleNavigationDragEnd = () => {
        if (!isNavigating) return;
        
        const absOffset = Math.abs(dragOffset);
        
        if (absOffset > dragThreshold) {
            if (dragOffset > 0 && hasPrevious) {
                goToPrevious();
            } else if (dragOffset < 0 && hasNext) {
                goToNext();
            }
        }
        
        setIsNavigating(false);
        setDragOffset(0);
        setNavigationStartX(0);
    };

    // Touch/Swipe handlers
    const onTouchStart = (e: React.TouchEvent) => {
        const clientX = e.targetTouches[0].clientX;
        setTouchEnd(null);
        setTouchStart(clientX);
        handleNavigationDragStart(clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        const clientX = e.targetTouches[0].clientX;
        setTouchEnd(clientX);
        handleNavigationDragMove(clientX);
    };

    const onTouchEnd = () => {
        handleNavigationDragEnd();
        setTouchStart(null);
        setTouchEnd(null);
    };

    // Mouse drag handlers for desktop navigation
    const handleMouseDownNavigation = (e: React.MouseEvent) => {
        if (isZoomed) return;
        e.preventDefault();
        handleNavigationDragStart(e.clientX);
    };

    const handleMouseMoveNavigation = (e: React.MouseEvent) => {
        if (isNavigating && !isZoomed) {
            e.preventDefault();
            handleNavigationDragMove(e.clientX);
        }
    };

    const handleMouseUpNavigation = () => {
        if (isNavigating) {
            handleNavigationDragEnd();
        }
    };

    // Get visible thumbnail range (show 7 thumbnails: current ±3)
    const getVisibleThumbnails = () => {
        const range = 3; // Show 3 thumbnails on each side
        const start = Math.max(0, currentIndex - range);
        const end = Math.min(items.length - 1, currentIndex + range);
        
        return items.slice(start, end + 1).map((item, idx) => ({
            item,
            actualIndex: start + idx
        }));
    };

    // Drag handlers for panning zoomed images
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isZoomed) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            x: e.clientX - imagePosition.x,
            y: e.clientY - imagePosition.y
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !isZoomed) return;
        e.preventDefault();
        setImagePosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    // Touch drag handlers for mobile
    const handleTouchStartDrag = (e: React.TouchEvent) => {
        if (!isZoomed) return;
        setIsDragging(true);
        const touch = e.touches[0];
        setDragStart({
            x: touch.clientX - imagePosition.x,
            y: touch.clientY - imagePosition.y
        });
    };

    const handleTouchMoveDrag = (e: React.TouchEvent) => {
        if (!isDragging || !isZoomed) return;
        const touch = e.touches[0];
        setImagePosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
        });
    };

    const handleTouchEndDrag = () => {
        setIsDragging(false);
    };

    // Toggle zoom and reset position
    const handleImageClick = () => {
        if (isZoomed) {
            setIsZoomed(false);
            setImagePosition({ x: 0, y: 0 });
        } else {
            setIsZoomed(true);
        }
    };

    // Handle close
    const handleClose = () => {
        setIsZoomed(false);
        onOpenChange(false);
    };

    // Get media type icon
    const getMediaTypeIcon = (item: MediaItem): string => {
        switch (item.mediaType) {
            case 'image':
                return 'hi/HiPhotograph';
            case 'video':
                return 'hi/HiVideoCamera';
            case 'pdf':
                return 'hi/HiDocumentText';
            default:
                return 'hi/HiDocument';
        }
    };

    // Render media content
    const renderMediaContent = () => {
        if (!currentItem) return null;

        switch (currentItem.mediaType) {
            case 'image':
                return (
                    <div 
                        className="relative w-full h-full flex items-center justify-center overflow-hidden"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onTouchStart={handleTouchStartDrag}
                        onTouchMove={handleTouchMoveDrag}
                        onTouchEnd={handleTouchEndDrag}
                    >
                        <img
                            ref={imageRef}
                            src={currentItem.secureUrl}
                            alt={currentItem.title || currentItem.originalFilename || 'Media item'}
                            className={cn(
                                'max-w-full max-h-full object-contain transition-transform duration-300',
                                isZoomed ? 'scale-150 cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
                                isDragging && 'transition-none'
                            )}
                            style={isZoomed ? {
                                transform: `scale(1.5) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                                transition: isDragging ? 'none' : 'transform 0.3s ease'
                            } : undefined}
                            onClick={handleImageClick}
                            draggable={false}
                        />
                    </div>
                );

            case 'video':
                return (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="w-full max-w-4xl max-h-full">
                            <video width="320" height="240" controls>
                                <source src={currentItem.secureUrl} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                        </div>
                    </div>
                );

            case 'pdf':
                return (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="w-full h-full max-w-6xl max-h-full bg-white rounded-lg overflow-hidden shadow-2xl">
                            <iframe
                                src={`${currentItem.secureUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=page-width`}
                                className="w-full h-full border-0"
                                title={`PDF: ${currentItem.title || currentItem.originalFilename || 'PDF Document'}`}
                                allow="fullscreen"
                            />
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-white">
                            <Icon name="hi/HiDocument" size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Unsupported media type</p>
                        </div>
                    </div>
                );
        }
    };

    if (!currentItem) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-none w-screen h-screen p-0 bg-black/95 border-none [&>button.absolute.right-4.top-4]:hidden"
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                {/* Accessible title for screen readers */}
                <VisuallyHidden>
                    <DialogTitle>
                        {currentItem.title || currentItem.originalFilename || 'Media viewer'} - {currentIndex + 1} of {items.length}
                    </DialogTitle>
                </VisuallyHidden>

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/50 to-transparent p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                            <Icon
                                name={getMediaTypeIcon(currentItem)}
                                size={20}
                                className="text-white/70"
                            />
                            <div>
                                <h2 className="font-medium truncate max-w-md">
                                    {currentItem.title || currentItem.originalFilename || 'Untitled'}
                                </h2>
                                <p className="text-sm text-white/70">
                                    {currentIndex + 1} of {items.length}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Close button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClose}
                                className="text-white hover:bg-white/10"
                                title="Close (Escape)"
                            >
                                <Icon name="hi/HiX" size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main content with swipe/drag navigation */}
                <div 
                    ref={contentRef}
                    className="relative w-full h-full touch-pan-y overflow-hidden"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onMouseDown={handleMouseDownNavigation}
                    onMouseMove={handleMouseMoveNavigation}
                    onMouseUp={handleMouseUpNavigation}
                    onMouseLeave={handleMouseUpNavigation}
                >
                    {/* Container with drag offset */}
                    <div 
                        className="relative w-full h-full flex items-center justify-center"
                        style={{
                            transform: `translateX(${dragOffset}px)`,
                            transition: isNavigating ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: isNavigating ? 'grabbing' : (isZoomed ? 'default' : 'grab')
                        }}
                    >
                        {/* Previous image preview */}
                        {hasPrevious && dragOffset > 20 && (
                            <div 
                                className="absolute left-0 top-0 w-full h-full flex items-center justify-center opacity-50"
                                style={{
                                    transform: `translateX(-100%)`,
                                    pointerEvents: 'none'
                                }}
                            >
                                {items[currentIndex - 1].mediaType === 'image' && (
                                    <img
                                        src={items[currentIndex - 1].secureUrl}
                                        alt="Previous"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                )}
                            </div>
                        )}

                        {/* Current image */}
                        <div className="w-full h-full flex items-center justify-center">
                            {renderMediaContent()}
                        </div>

                        {/* Next image preview */}
                        {hasNext && dragOffset < -20 && (
                            <div 
                                className="absolute right-0 top-0 w-full h-full flex items-center justify-center opacity-50"
                                style={{
                                    transform: `translateX(100%)`,
                                    pointerEvents: 'none'
                                }}
                            >
                                {items[currentIndex + 1].mediaType === 'image' && (
                                    <img
                                        src={items[currentIndex + 1].secureUrl}
                                        alt="Next"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation buttons - Enhanced visibility */}
                {hasPrevious && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPrevious}
                        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-[60] text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg border border-white/20"
                        title="Previous (←)"
                    >
                        <Icon name="hi/HiChevronLeft" size={24} />
                    </Button>
                )}

                {hasNext && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNext}
                        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-[60] text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg border border-white/20"
                        title="Next (→)"
                    >
                        <Icon name="hi/HiChevronRight" size={24} />
                    </Button>
                )}

                {/* Thumbnail Navigation Strip - Smart loading */}
                <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-4 pt-8">
                    {/* Thumbnail strip - Only show nearby items */}
                    <div className="max-w-7xl mx-auto mb-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                            {/* Show indicator for items before visible range */}
                            {currentIndex > 3 && (
                                <div className="flex items-center gap-1 text-white/50 text-xs mr-2">
                                    <Icon name="hi/HiChevronLeft" size={16} />
                                    <span>{currentIndex - 3} more</span>
                                </div>
                            )}

                            {/* Visible thumbnails */}
                            <div 
                                className="flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth"
                                style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: 'rgba(255,255,255,0.2) transparent'
                                }}
                            >
                                {getVisibleThumbnails().map(({ item, actualIndex }) => (
                                    <button
                                        key={item.id}
                                        ref={(el) => { thumbnailRefs.current[actualIndex] = el; }}
                                        onClick={() => onIndexChange(actualIndex)}
                                        className={cn(
                                            'relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-all duration-200',
                                            actualIndex === currentIndex
                                                ? 'border-white scale-110 ring-2 ring-white/50'
                                                : 'border-white/30 hover:border-white/60 opacity-70 hover:opacity-100'
                                        )}
                                        title={item.title || item.originalFilename || `Item ${actualIndex + 1}`}
                                    >
                                        {item.mediaType === 'image' ? (
                                            <img
                                                src={item.secureUrl}
                                                alt={item.title || item.originalFilename || `Thumbnail ${actualIndex + 1}`}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : item.mediaType === 'video' ? (
                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                <Icon name="hi/HiVideoCamera" size={20} className="text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                <Icon name="hi/HiDocumentText" size={20} className="text-white" />
                                            </div>
                                        )}
                                        {/* Current indicator */}
                                        {actualIndex === currentIndex && (
                                            <div className="absolute inset-0 bg-white/20 pointer-events-none" />
                                        )}
                                        {/* Index label */}
                                        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl">
                                            {actualIndex + 1}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Show indicator for items after visible range */}
                            {currentIndex < items.length - 4 && (
                                <div className="flex items-center gap-1 text-white/50 text-xs ml-2">
                                    <span>{items.length - currentIndex - 4} more</span>
                                    <Icon name="hi/HiChevronRight" size={16} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata panel - Always visible */}
                    <div className="max-w-2xl mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                            <div>
                                <h3 className="font-medium mb-2">File Information</h3>
                                <div className="space-y-1 text-sm text-white/70">
                                    <p><span className="text-white/90">Format:</span> {currentItem.format.toUpperCase()}</p>
                                    <p><span className="text-white/90">Size:</span> {formatFileSize(currentItem.bytes)}</p>
                                    {currentItem.width && currentItem.height && (
                                        <p><span className="text-white/90">Dimensions:</span> {currentItem.width} × {currentItem.height}</p>
                                    )}
                                    <p><span className="text-white/90">Created:</span> {formatDate(currentItem.createdAt)}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium mb-2">Details</h3>
                                <div className="space-y-2">
                                    {currentItem.description && (
                                        <p className="text-sm text-white/90">{currentItem.description}</p>
                                    )}
                                    {currentItem.tags && currentItem.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {currentItem.tags.map((tag, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="secondary"
                                                    className="text-xs bg-white/10 text-white border-white/20"
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}