/**
 * Gallery Component
 * 
 * Main container component that orchestrates all gallery functionality.
 * Simplified version that consolidates the complex GalleryPage into a streamlined interface.
 * 
 * Requirements: 1.1, 1.4, 3.1
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMedia } from '@/lib/queries/useMedia';
import { useGalleryState } from '@/lib/hooks/gallery';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';
import type { MediaItem } from '@/types/gallery';

// Import the new simplified components
import { MediaGrid } from './MediaGrid';
import { MediaUploadButton, MediaUpload } from './MediaUpload';
import { MediaPanel } from './MediaPanel';
import { MediaLightbox } from './MediaLightbox';

/**
 * Gallery props interface
 */
export interface GalleryProps {
    /**
     * Gallery mode - standalone or picker
     * @default 'standalone'
     */
    mode?: 'standalone' | 'picker';

    /**
     * Callback when media is selected (picker mode)
     */
    onMediaSelect?: (urls: string | string[]) => void;

    /**
     * Allow multiple selection (picker mode)
     * @default false
     */
    allowMultiple?: boolean;

    /**
     * Initial tab to display
     * @default 'images'
     */
    initialTab?: 'images' | 'videos' | 'pdfs';

    /**
     * CSS class name
     */
    className?: string;
}

/**
 * Tab configuration
 */
const TABS = [
    { id: 'images' as const, label: 'Images', icon: 'hi/HiPhotograph' },
    { id: 'videos' as const, label: 'Videos', icon: 'hi/HiVideoCamera' },
    { id: 'pdfs' as const, label: 'PDFs', icon: 'hi/HiDocumentText' },
];

/**
 * Accepted file types for upload
 */
const ACCEPTED_TYPES = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    'video/*': ['.mp4', '.webm', '.mov', '.avi'],
    'application/pdf': ['.pdf'],
};

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Main Gallery component
 * 
 * Provides a unified interface for media management with tabs, view modes,
 * upload functionality, and selection handling.
 */
export function Gallery({
    mode = 'standalone',
    onMediaSelect,
    allowMultiple = false,
    initialTab = 'images',
    className,
}: GalleryProps) {
    const { user } = useAuth();


    // Gallery state management
    const galleryState = useGalleryState({
        mode,
        initialTab,
        syncWithUrl: mode === 'standalone',
        // Use list view for PDFs by default, masonry for others
        initialViewMode: 'masonry',
    });

    const {
        activeTab,
        viewMode,
        selectedIds,
        hasSelection,
        selectionCount,
        selectedArray,
        lastSelectedId,
        setActiveTab,
        setViewMode,
        toggleViewMode,
        selectItem,
        selectRange,
        clearSelection,
        setUploading,
    } = galleryState;

    // Upload dialog state
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

    // Lightbox state
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Convert activeTab to MediaTab format for the API
    const mediaType = activeTab; // activeTab is already 'images' | 'videos' | 'pdfs'

    // Media operations - enable when user is authenticated
    const media = useMedia({
        mediaType: mediaType as 'images' | 'videos' | 'pdfs',
        enabled: !!user?.id, // Enable when user is authenticated
        upload: {
            acceptedTypes: ACCEPTED_TYPES,
            maxSize: MAX_SIZE,
            maxFiles: MAX_FILES,
            onSuccess: () => {
                setUploading(false);
                // Close the upload dialog after successful upload
                setIsUploadDialogOpen(false);
            },
            onError: () => {
                setUploading(false);
            },
        },
        delete: {
            onSuccess: () => {
                clearSelection();
            },
        },
    });

    const {
        items,
        totalCount,
        isLoading,
        isError,
        hasMore,
        isFetchingMore,
        loadMore,
        upload,
        delete: deleteItems,
        isUploading,
        isDeleting,
        refetch,
    } = media;

    // Filter items based on active tab - no filtering needed since we fetch by type
    const filteredItems = items;

    // Get selected media items
    const selectedItems = filteredItems.filter(item => selectedIds.has(item.id));

    /**
     * Convert API media items to MediaItem format for lightbox
     */
    const convertToMediaItem = useCallback((item: any): MediaItem => {
        // Determine media type based on resource type and file extension
        let mediaType: 'image' | 'video' | 'pdf' = 'pdf'; // default fallback

        if (item.resourceType === 'image') {
            mediaType = 'image';
        } else if (item.resourceType === 'video') {
            mediaType = 'video';
        } else if (item.resourceType === 'raw') {
            // Check if it's a PDF
            const isPDF = item.format === 'pdf' ||
                item.originalFilename?.toLowerCase().endsWith('.pdf') ||
                item.original_filename?.toLowerCase().endsWith('.pdf') ||
                item.secureUrl?.toLowerCase().includes('.pdf') ||
                item.secure_url?.toLowerCase().includes('.pdf');
            mediaType = isPDF ? 'pdf' : 'pdf'; // default to pdf for raw files
        }

        return {
            id: item.id || item._id,
            publicId: item.publicId || item.public_id,
            url: item.secureUrl || item.secure_url,
            secureUrl: item.secureUrl || item.secure_url,
            mediaType,
            format: item.format,
            width: item.width,
            height: item.height,
            bytes: item.bytes,
            createdAt: item.createdAt || item.created_at,
            resourceType: item.resourceType || item.resource_type,
            originalFilename: item.originalFilename || item.original_filename,
            title: item.title || item.originalFilename || item.original_filename,
            tags: item.tags || [],
        };
    }, []);

    // Convert filtered items for lightbox (all media types)
    const lightboxItems = filteredItems.map(convertToMediaItem);

    /**
     * Handle tab change
     */
    const handleTabChange = useCallback((tab: 'images' | 'videos' | 'pdfs') => {
        setActiveTab(tab);
        // Don't automatically change view mode - respect user's localStorage preference
    }, [setActiveTab]);

    /**
     * Handle media selection with range support
     */
    const handleSelect = useCallback((id: string, modifiers: { shift?: boolean; ctrl?: boolean; meta?: boolean }) => {
        // In picker mode with single selection, handle immediately
        if (mode === 'picker' && !allowMultiple && onMediaSelect) {
            const selectedItem = filteredItems.find(item => item.id === id);
            if (selectedItem) {
                onMediaSelect(selectedItem.secureUrl);
                return;
            }
        }

        const isShift = modifiers.shift || false;

        // Handle range selection with Shift
        if (isShift && lastSelectedId) {
            const allItemIds = filteredItems.map(item => item.id);
            selectRange(lastSelectedId, id, allItemIds);
        }
        // All other clicks are additive (toggle)
        else {
            selectItem(id, true);
        }
    }, [mode, allowMultiple, onMediaSelect, filteredItems, selectItem, selectRange, lastSelectedId]);

    /**
     * Handle file upload
     */
    const handleUpload = useCallback((files: File[]) => {
        setUploading(true);
        upload(files);
    }, [upload, setUploading]);

    /**
     * Handle media click for lightbox
     */
    const handleMediaClick = useCallback((media: any) => {
        // Convert all media types to MediaItem format for lightbox
        const allLightboxItems = filteredItems.map(convertToMediaItem);
        const mediaIndex = allLightboxItems.findIndex(item => item.id === media.id);

        if (mediaIndex !== -1) {
            setLightboxIndex(mediaIndex);
            setIsLightboxOpen(true);
        }
    }, [filteredItems, convertToMediaItem]);

    /**
     * Handle lightbox index change
     */
    const handleLightboxIndexChange = useCallback((newIndex: number) => {
        setLightboxIndex(newIndex);
    }, []);

    /**
     * Handle media deletion
     */
    const handleDelete = useCallback((id: string) => {
        if (!user?.id) return;
        deleteItems([id]);
    }, [deleteItems, user?.id]);

    /**
     * Handle bulk deletion
     */
    const handleBulkDelete = useCallback(() => {
        if (!user?.id || selectedArray.length === 0) return;
        deleteItems(selectedArray);
    }, [deleteItems, user?.id, selectedArray]);

    /**
     * Handle confirm selection in picker mode
     */
    const handleConfirmSelection = useCallback(() => {
        if (mode === 'picker' && onMediaSelect && hasSelection) {
            const selectedUrls = selectedItems.map(item => item.secureUrl);

            if (allowMultiple) {
                onMediaSelect(selectedUrls);
            } else {
                onMediaSelect(selectedUrls[0]);
            }
        }
    }, [mode, onMediaSelect, allowMultiple, hasSelection, selectedItems]);

    /**
     * Handle escape key to clear selections
     */
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && hasSelection) {
                clearSelection();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [hasSelection, clearSelection]);

    /**
     * Error state
     */
    if (isError) {
        return (
            <div className={cn('gallery min-h-screen', className)}>
                <div className="container mx-auto py-16">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-destructive mb-4">
                            Failed to load media
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            There was an error loading your media files. Please try again.
                        </p>
                        <button
                            onClick={() => refetch()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('gallery min-h-screen ', className)}>
            {/* ARIA live region for status updates */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {isLoading && 'Loading media items'}
                {isFetchingMore && 'Loading more items'}
                {isDeleting && `Deleting ${selectionCount} item${selectionCount !== 1 ? 's' : ''}`}
                {hasSelection && `${selectionCount} item${selectionCount !== 1 ? 's' : ''} selected`}
            </div>

            {/* Header with title and upload */}
            <div className="border-b ">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Media Gallery</h1>
                            <p className="text-muted-foreground mt-1">
                                Manage your images, videos, and PDFs ({totalCount} items)
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Add Media Button */}
                            <MediaUploadButton
                                onClick={() => setIsUploadDialogOpen(true)}
                                disabled={!user?.id}
                            />

                            {/* View mode toggle - show different behavior for PDFs */}
                            <button
                                onClick={toggleViewMode}
                                className={cn(
                                    "p-2 rounded-lg border hover:bg-accent",
                                    activeTab === 'pdfs' && viewMode === 'masonry' && "border-amber-500 bg-amber-50"
                                )}
                                title={
                                    activeTab === 'pdfs'
                                        ? `${viewMode === 'list' ? 'Grid view (not recommended for PDFs)' : 'List view (recommended for PDFs)'}`
                                        : `Switch to ${viewMode === 'masonry' ? 'list' : 'masonry'} view`
                                }
                            >
                                <Icon name={viewMode === 'masonry' ? 'hi/HiViewList' : 'hi/HiViewGrid'} size={20} />
                                {activeTab === 'pdfs' && viewMode === 'masonry' && (
                                    <span className="sr-only">List view recommended for PDFs</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Tab Navigation */}
            <div className="border-b">
                <div className="container mx-auto px-4">
                    <nav className="flex space-x-8" aria-label="Media type tabs">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors',
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                                )}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                <Icon name={tab.icon} size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex">
                {/* Media Grid */}
                <div className="flex-1 min-w-0">
                    {/* Media Grid */}
                    <MediaGrid
                        items={filteredItems}
                        viewMode={viewMode}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onDelete={mode === 'standalone' ? handleDelete : undefined}
                        onClick={handleMediaClick}
                        isLoading={isLoading}
                        hasMore={hasMore}
                        isFetchingMore={isFetchingMore}
                        onLoadMore={loadMore}
                    />
                </div>

                {/* Side Panel - only in standalone mode */}
                {mode === 'standalone' && (
                    <div className="sticky top-2 h-full overflow-y-auto">
                        <MediaPanel
                            selectedItems={selectedItems}
                            onClose={clearSelection}
                            onDelete={handleBulkDelete}
                            onClearSelection={clearSelection}
                            isDeleting={isDeleting}
                        />
                    </div>

                )}
            </div>

            {/* Picker Mode: Selection Confirmation Bar */}
            {mode === 'picker' && allowMultiple && hasSelection && (
                <div className="fixed bottom-0 left-0 right-0 z-50">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                    {selectionCount}
                                </div>
                                <span className="text-sm font-medium">
                                    {selectionCount} {selectionCount === 1 ? 'item' : 'items'} selected
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="px-4 py-2 rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmSelection}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    Select {selectionCount} {selectionCount === 1 ? 'Item' : 'Items'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Dialog */}
            <MediaUpload
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
                onUpload={handleUpload}
                acceptedTypes={ACCEPTED_TYPES}
                maxSize={MAX_SIZE}
                maxFiles={MAX_FILES}
                isUploading={isUploading}
            />

            {/* Media Lightbox */}
            <MediaLightbox
                open={isLightboxOpen}
                onOpenChange={setIsLightboxOpen}
                items={lightboxItems}
                currentIndex={lightboxIndex}
                onIndexChange={handleLightboxIndexChange}
            />
        </div>
    );
}