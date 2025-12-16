/**
 * GalleryPage Component
 * 
 * Main container that orchestrates all gallery functionality.
 * Serves as the central media management system.
 * 
 * Requirements: All core requirements
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GalleryPageProps, MediaTab, GalleryState, MediaItem } from './types';
import { GalleryHeader } from './GalleryHeader';
import { MediaTabs } from './MediaTabs';
import { MasonryGrid } from './MasonryGrid';
import { UploadSheet } from './UploadSheet';
import { GallerySidePanel, MobileGallerySidePanel } from './GallerySidePanel';
import { ErrorState } from './ErrorState';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { useMediaDelete } from '@/lib/hooks/useMediaDelete';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

/**
 * Accepted file types for upload
 */
const ACCEPTED_TYPES = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    'video/*': ['.mp4', '.webm', '.mov'],
    'application/pdf': ['.pdf'],
};

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function GalleryPage({
    mode = 'standalone',
    onMediaSelect,
    allowMultiple = false,
    mediaType = 'all',
    initialTab = 'images',
}: GalleryPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    /**
     * Get initial tab from URL parameter or use default
     * Requirements: 8.2, 8.5
     * - Read tab parameter from URL on mount
     * - Default to 'images' tab if no parameter
     */
    const getInitialTab = useCallback((): MediaTab => {
        // In picker mode, use initialTab prop
        if (mode === 'picker') {
            return initialTab;
        }

        // In standalone mode, read from URL
        const tabParam = searchParams.get('tab');

        // Validate tab parameter
        if (tabParam === 'images' || tabParam === 'videos' || tabParam === 'pdfs') {
            return tabParam;
        }

        // Default to images tab
        return 'images';
    }, [mode, initialTab, searchParams]);

    /**
     * Gallery state management
     * Tracks active tab, selected media, view mode, and upload status
     */
    const [state, setState] = useState<GalleryState>({
        activeTab: getInitialTab(),
        selectedMedia: new Set<string>(),
        viewMode: 'grid',
        isUploading: false,
    });

    const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

    const { toast } = useToast();
    const { user } = useAuth();

    /**
     * Sync URL with active tab
     * Requirements: 8.1, 8.4
     * - Update URL when tab changes
     * - Handle browser back/forward
     */
    useEffect(() => {
        // Only update URL in standalone mode
        if (mode !== 'standalone') {
            return;
        }

        const currentTab = searchParams.get('tab');

        // Update URL if tab doesn't match current state
        if (currentTab !== state.activeTab) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', state.activeTab);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [state.activeTab, mode, router]);

    /**
     * Handle browser back/forward navigation
     * Requirements: 8.4
     */
    useEffect(() => {
        // Only handle URL changes in standalone mode
        if (mode !== 'standalone') {
            return;
        }

        const tabParam = searchParams.get('tab');

        // Validate and update state if URL changed (e.g., browser back/forward)
        if (tabParam && (tabParam === 'images' || tabParam === 'videos' || tabParam === 'pdfs')) {
            if (tabParam !== state.activeTab) {
                setState((prev) => ({
                    ...prev,
                    activeTab: tabParam,
                    selectedMedia: new Set<string>(), // Clear selection on tab change
                }));
            }
        }
    }, [searchParams, mode, state.activeTab]);

    /**
     * Query media based on active tab
     * Uses React Query for data fetching with infinite scroll support
     */
    const {
        data,
        isLoading,
        isError,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
    } = useMediaQuery({
        mediaType: state.activeTab,
    });

    /**
     * Delete mutation hook
     */
    const deleteMutation = useMediaDelete({
        onSuccess: () => {
            // Clear selection after successful deletion
            handleClearSelection();
        },
    });

    /**
     * Flatten paginated media items
     */
    const mediaItems = data?.pages.flatMap((page) => page.resources) ?? [];

    /**
     * Handle tab change
     * Requirements: 1.3, 3.5, 8.1
     * - Updates activeTab state
     * - Clears selection on tab change
     * - Triggers media query for new tab
     * - Updates URL parameter (handled by useEffect)
     */
    const handleTabChange = useCallback((newTab: MediaTab) => {
        setState((prev) => ({
            ...prev,
            activeTab: newTab,
            selectedMedia: new Set<string>(), // Clear selection on tab change
        }));
    }, []);

    /**
     * Handle media selection
     * Requirements: 3.1, 3.2, 7.3
     * Supports both single and multi-select modes
     * In picker mode, calls onMediaSelect callback
     */
    const handleSelect = useCallback(
        (id: string, isMultiSelect: boolean) => {
            setState((prev) => {
                const newSelected = new Set(prev.selectedMedia);

                // In picker mode with single selection, immediately return the URL
                if (mode === 'picker' && !allowMultiple && onMediaSelect) {
                    const selectedItem = mediaItems.find((item) => item.id === id);
                    if (selectedItem) {
                        onMediaSelect(selectedItem.secureUrl);
                        return prev; // Don't update selection state
                    }
                }

                if (isMultiSelect || allowMultiple) {
                    // Multi-select: toggle selection
                    if (newSelected.has(id)) {
                        newSelected.delete(id);
                    } else {
                        newSelected.add(id);
                    }
                } else {
                    // Single select: replace selection
                    if (newSelected.has(id) && newSelected.size === 1) {
                        // If clicking the only selected item, deselect it
                        newSelected.clear();
                    } else {
                        // Otherwise, select only this item
                        newSelected.clear();
                        newSelected.add(id);
                    }
                }

                return {
                    ...prev,
                    selectedMedia: newSelected,
                };
            });
        },
        [mode, allowMultiple, onMediaSelect, mediaItems]
    );

    /**
     * Clear all selections
     * Requirements: 3.5
     */
    const handleClearSelection = useCallback(() => {
        setState((prev) => ({
            ...prev,
            selectedMedia: new Set<string>(),
        }));
    }, []);

    /**
     * Handle media deletion
     * Requirements: 5.1, 5.3
     */
    const handleDelete = useCallback(
        (id: string) => {
            if (!user?.id) {
                toast({
                    variant: 'destructive',
                    title: 'Authentication Required',
                    description: 'Please log in to delete media',
                });
                return;
            }

            // Find the media item to get its publicId
            const mediaItem = mediaItems.find(item => item.id === id);
            if (!mediaItem) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Media item not found',
                });
                return;
            }

            deleteMutation.mutate({
                mediaIds: mediaItem.publicId,
                mediaType: state.activeTab,
            });
        },
        [state.activeTab, deleteMutation, toast, mediaItems]
    );

    /**
     * Handle bulk deletion
     * Requirements: 6.3
     */
    const handleBulkDelete = useCallback(() => {
        if (!user?.id) {
            toast({
                variant: 'destructive',
                title: 'Authentication Required',
                description: 'Please log in to delete media',
            });
            return;
        }

        const selectedIds = Array.from(state.selectedMedia);
        if (selectedIds.length === 0) return;

        // Map selected IDs to publicIds
        const publicIds = selectedIds
            .map(id => {
                const item = mediaItems.find(m => m.id === id);
                return item?.publicId;
            })
            .filter((publicId): publicId is string => !!publicId);

        if (publicIds.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No valid media items found',
            });
            return;
        }

        deleteMutation.mutate({
            mediaIds: publicIds,
            mediaType: state.activeTab,
        });
    }, [state.selectedMedia, state.activeTab, deleteMutation, toast, mediaItems]);

    /**
     * Handle upload button click
     * Requirements: 2.1
     */
    const handleUploadClick = useCallback(() => {
        setIsUploadSheetOpen(true);
    }, []);

    /**
     * Handle upload sheet close
     */
    const handleUploadSheetClose = useCallback(() => {
        setIsUploadSheetOpen(false);
        setUploadingFiles([]);
    }, []);

    /**
     * Handle file upload
     * Requirements: 2.4, 10.4
     * Shows optimistic UI updates
     */
    const handleUpload = useCallback((files: File[]) => {
        // Show uploading files immediately (optimistic UI)
        setUploadingFiles(files);

        // Files will be uploaded by UploadSheet component
        // After upload completes, clear uploading files
        setTimeout(() => {
            setUploadingFiles([]);
        }, 3000);
    }, []);

    /**
     * Handle copy URL
     * Requirements: 4.3
     */
    const handleCopyUrl = useCallback(
        (url: string) => {
            // Toast is already shown by MediaDetailPanel
            console.log('URL copied:', url);
        },
        []
    );

    /**
     * Handle close side panel
     * Requirements: 4.4
     */
    const handleCloseSidePanel = useCallback(() => {
        handleClearSelection();
    }, [handleClearSelection]);

    /**
     * Handle escape key to close panels and dialogs
     */
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // Close upload sheet if open
                if (isUploadSheetOpen) {
                    setIsUploadSheetOpen(false);
                }
                // Clear selection (closes side panel)
                else if (state.selectedMedia.size > 0) {
                    handleClearSelection();
                }
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isUploadSheetOpen, state.selectedMedia.size, handleClearSelection]);

    /**
     * Calculate total count for active tab
     */
    const totalCount = data?.pages[0]?.totalCount ?? 0;

    /**
     * Get selected media items
     */
    const selectedMediaItems: MediaItem[] = mediaItems.filter((item) =>
        state.selectedMedia.has(item.id)
    );

    /**
     * Handle load more for infinite scroll
     * Requirements: 1.4, 10.1
     */
    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    /**
     * Error state
     * Requirements: 9.4
     * Show error state when query fails with retry button
     */
    if (isError) {
        // Get error message from the query error
        const errorMessage = (data as any)?.error?.message || 'Failed to load media. Please try again.';

        return (
            <div className="min-h-screen bg-background">
                {mode === 'standalone' && (
                    <GalleryHeader
                        title="Media Gallery"
                        itemCount={0}
                        onUploadClick={handleUploadClick}
                        description="Manage your images, videos, and PDFs"
                    />
                )}
                <MediaTabs activeTab={state.activeTab} onTabChange={handleTabChange} />
                <div className="container mx-auto py-16">
                    <ErrorState
                        message={errorMessage}
                        onRetry={() => refetch()}
                    />
                </div>
            </div>
        );
    }

    /**
     * Handle confirm selection in picker mode
     * Requirements: 7.3, 7.4
     */
    const handleConfirmSelection = useCallback(() => {
        if (mode === 'picker' && onMediaSelect && state.selectedMedia.size > 0) {
            const selectedUrls = selectedMediaItems.map((item) => item.secureUrl);

            if (allowMultiple) {
                // Return array of URLs for multiple selection
                onMediaSelect(selectedUrls);
            } else {
                // Return single URL
                onMediaSelect(selectedUrls[0]);
            }
        }
    }, [mode, onMediaSelect, allowMultiple, state.selectedMedia, selectedMediaItems]);

    return (
        <div className={cn(
            'gallery-page min-h-screen bg-background',
            mode === 'picker' && 'picker-mode'
        )}>
            {/* ARIA live region for status updates */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {isLoading && 'Loading media items'}
                {isFetchingNextPage && 'Loading more items'}
                {deleteMutation.isPending && `Deleting ${state.selectedMedia.size} item${state.selectedMedia.size !== 1 ? 's' : ''}`}
                {state.selectedMedia.size > 0 && `${state.selectedMedia.size} item${state.selectedMedia.size !== 1 ? 's' : ''} selected`}
            </div>

            {/* Header - hide in picker mode if embedded */}
            {mode === 'standalone' && (
                <GalleryHeader
                    title="Media Gallery"
                    itemCount={totalCount}
                    onUploadClick={handleUploadClick}
                    description="Manage your images, videos, and PDFs"
                />
            )}

            {/* Tab Navigation */}
            <MediaTabs activeTab={state.activeTab} onTabChange={handleTabChange} />

            {/* Main Content Area */}
            <div className="flex">
                {/* Masonry Grid */}
                <div className="flex-1 min-w-0">
                    <MasonryGrid
                        mediaItems={mediaItems}
                        selectedIds={state.selectedMedia}
                        onSelect={handleSelect}
                        onDelete={mode === 'standalone' ? handleDelete : undefined}
                        isLoading={isLoading}
                        isFetchingMore={isFetchingNextPage}
                        hasMore={hasNextPage ?? false}
                        onLoadMore={handleLoadMore}
                        uploadingFiles={uploadingFiles}
                    />
                </div>

                {/* Side Panel (Desktop) - only in standalone mode */}
                {mode === 'standalone' && (
                    <GallerySidePanel
                        selectedMedia={selectedMediaItems}
                        onClose={handleCloseSidePanel}
                        onDelete={handleDelete}
                        onBulkDelete={handleBulkDelete}
                        onClearSelection={handleClearSelection}
                        onCopyUrl={handleCopyUrl}
                        isDeleting={deleteMutation.isPending}
                    />
                )}
            </div>

            {/* Side Panel (Mobile) - only in standalone mode */}
            {mode === 'standalone' && (
                <MobileGallerySidePanel
                    selectedMedia={selectedMediaItems}
                    onClose={handleCloseSidePanel}
                    onDelete={handleDelete}
                    onBulkDelete={handleBulkDelete}
                    onClearSelection={handleClearSelection}
                    onCopyUrl={handleCopyUrl}
                    isDeleting={deleteMutation.isPending}
                />
            )}

            {/* Picker Mode: Selection Confirmation Bar */}
            {mode === 'picker' && allowMultiple && state.selectedMedia.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                    {state.selectedMedia.size}
                                </div>
                                <span className="text-sm font-medium">
                                    {state.selectedMedia.size} {state.selectedMedia.size === 1 ? 'item' : 'items'} selected
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleClearSelection}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                        'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                                    )}
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmSelection}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                        'bg-primary text-primary-foreground hover:bg-primary/90'
                                    )}
                                >
                                    Select {state.selectedMedia.size} {state.selectedMedia.size === 1 ? 'Item' : 'Items'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Sheet - only in standalone mode */}
            {mode === 'standalone' && (
                <UploadSheet
                    isOpen={isUploadSheetOpen}
                    onClose={handleUploadSheetClose}
                    onUpload={handleUpload}
                    acceptedTypes={ACCEPTED_TYPES}
                    maxFiles={MAX_FILES}
                    maxSize={MAX_SIZE}
                />
            )}
        </div>
    );
}
