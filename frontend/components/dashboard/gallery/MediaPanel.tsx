/**
 * MediaPanel Component
 * 
 * Side panel for media details and bulk actions.
 * Shows selected media information and provides management controls.
 * 
 * Requirements: 4.3, 4.4
 */

'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';
import Image from 'next/image';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { InputTags } from '@/components/ui/InputTags';
import { useMediaUpdate } from '@/lib/queries/useMediaUpdate';
import type { MediaItem } from '@/types/gallery';

interface EditFormData {
    title: string;
    description: string;
    tags: string[];
}

/**
 * MediaPanel props interface
 */
interface MediaPanelProps {
    selectedItems: MediaItem[];
    onClose: () => void;
    onDelete: (ids: string[]) => void;
    onEdit?: (id: string) => void;
    onClearSelection: () => void;
    isDeleting?: boolean;
    className?: string;
}

/**
 * MediaPanel Component
 */
export function MediaPanel({
    selectedItems,
    onClose,
    onDelete,
    onEdit,
    onClearSelection,
    isDeleting = false,
    className,
}: MediaPanelProps) {
    const hasSelection = selectedItems.length > 0;
    const isSingleSelection = selectedItems.length === 1;
    const { toast } = useToast();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editFormData, setEditFormData] = useState<EditFormData>({
        title: '',
        description: '',
        tags: [],
    });
    const [seenEditSeed, setSeenEditSeed] = useState<string | null>(null);

    // Use the media update hook
    const updateMutation = useMediaUpdate({
        onSuccess: () => {
            setShowEditDialog(false);
        },
        showToast: true,
    });

    const editItem = isSingleSelection ? selectedItems[0] : undefined;
    const editSeed = showEditDialog ? editItem?.id ?? null : null;

    if (editSeed !== seenEditSeed) {
        setSeenEditSeed(editSeed);
        if (editItem && editSeed) {
            setEditFormData({
                title: editItem.title || editItem.originalFilename || '',
                description: editItem.description || '',
                tags: editItem.tags || [],
            });
        }
    }

    /**
     * Handle bulk delete - show confirmation dialog
     */
    const handleBulkDelete = useCallback(() => {
        if (selectedItems.length === 0) return;
        console.log('Opening delete dialog for', selectedItems.length, 'items');
        setShowDeleteDialog(true);
    }, [selectedItems.length]);

    /**
     * Confirm and execute delete
     */
    const confirmDelete = useCallback(() => {
        const ids = selectedItems.map(item => item.id);
        onDelete(ids);
        setShowDeleteDialog(false);
    }, [selectedItems, onDelete]);

    /**
     * Handle edit button click
     */
    const handleEditClick = useCallback(() => {
        if (!isSingleSelection) return;
        setShowEditDialog(true);
    }, [isSingleSelection]);

    /**
     * Handle save edited data
     */
    const handleSaveEdit = useCallback(() => {
        if (!isSingleSelection || updateMutation.isPending) return;

        const item = selectedItems[0];

        // Determine mediaType from resourceType
        let mediaType = 'images';
        if (item.resourceType === 'video') {
            mediaType = 'videos';
        } else if (item.resourceType === 'raw' || item.format === 'pdf') {
            mediaType = 'pdfs';
        }

        // Call the mutation
        updateMutation.mutate({
            imageId: item.id,
            mediaType,
            title: editFormData.title,
            description: editFormData.description,
            tags: editFormData.tags,
        });
    }, [isSingleSelection, selectedItems, editFormData, updateMutation]);

    /**
     * Handle copy URL
     */
    const handleCopyUrl = useCallback(async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            toast({
                title: 'Copied to clipboard',
                description: 'URL has been copied to your clipboard.',
            });
        } catch (error) {
            console.error('Failed to copy URL:', error);
            toast({
                title: 'Failed to copy',
                description: 'Could not copy URL to clipboard.',
                variant: 'destructive',
            });
        }
    }, [toast]);

    /**
     * Format file size
     */
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    /**
     * Format date
     */
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    /**
     * Get media type icon
     */
    const getMediaIcon = (item: MediaItem) => {
        switch (item.resourceType) {
            case 'image':
                return 'hi/HiPhotograph';
            case 'video':
                return 'hi/HiVideoCamera';
            case 'raw':
                return item.format === 'pdf' ? 'hi/HiDocumentText' : 'hi/HiFolder';
            default:
                return 'hi/HiFolder';
        }
    };

    // Don't render if no selection
    if (!hasSelection) {
        return null;
    }

    return (
        <>
            <div
                className={cn(
                    'w-80 border-l bg-background flex flex-col',
                    'hidden lg:flex', // Hide on mobile, show on desktop
                    className
                )}
            >
                {/* Header */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                            {selectedItems.length} Selected
                        </h2>
                        {
                            isSingleSelection ? ''
                                :
                                <Button
                                    variant="outline"
                                    onClick={onClearSelection}
                                    className={cn(
                                        'text-sm',
                                        !isSingleSelection && 'col-span-2'
                                    )}
                                >
                                    Clear
                                </Button>
                        }

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className={cn(
                                'h-8 w-8',
                                !isSingleSelection && 'col-span-2'
                            )}
                            aria-label="Close panel"
                        >
                            <Icon name="lu/LuX" size={16} />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Bulk Actions */}
                    <div className="p-4 border-b space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Actions</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {isSingleSelection && (
                                <Button
                                    variant="default"
                                    onClick={handleEditClick}
                                    className="text-sm"
                                >
                                    <Icon name="hi/HiPencil" size={16} className="mr-2" />
                                    Edit
                                </Button>
                            )}
                            <Button
                                variant="destructive"
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                className={cn(
                                    'text-sm',
                                    !isSingleSelection && 'col-span-2'
                                )}
                            >
                                {isDeleting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                        Deleting...
                                    </span>
                                ) : (
                                    <>
                                        <Icon name="hi/HiTrash" size={16} className="mr-2" />
                                        Delete {isSingleSelection ? '' : 'All'}
                                    </>
                                )}
                            </Button>

                        </div>
                    </div>

                    {/* Selected Items */}
                    <div className="p-4 space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Selected Items</h3>
                        <div className="space-y-3">
                            {selectedItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                        {item.resourceType === 'image' ? (
                                            <Image
                                                src={item.secureUrl}
                                                alt={item.originalFilename || 'Media'}
                                                width={item.width}
                                                height={item.height}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg">
                                                {getMediaIcon(item)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium truncate">
                                            {item.originalFilename || `${item.publicId}.${item.format}`}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            {item.format.toUpperCase()} • {formatFileSize(item.bytes)}
                                        </p>
                                        {item.width && item.height && (
                                            <p className="text-xs text-muted-foreground">
                                                {item.width}×{item.height}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleCopyUrl(item.secureUrl)}
                                            className="p-1 rounded hover:bg-accent text-xs"
                                            title="Copy URL"
                                            aria-label="Copy URL"
                                        >
                                            <Icon name="hi/HiClipboardCopy" size={16} />
                                        </Button>
                                        {onEdit && item.resourceType === 'image' && (
                                            <Button
                                                variant="ghost"
                                                onClick={() => onEdit(item.id)}
                                                className="p-1 rounded hover:bg-accent text-xs"
                                                title="Edit"
                                                aria-label="Edit media"
                                            >
                                                <Icon name="hi/HiPencil" size={16} />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Single Item Details */}
                    {selectedItems.length === 1 && (
                        <div className="p-4 border-t space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Title:</span>
                                    <p className="font-medium">{selectedItems[0].title || 'No title'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Description:</span>
                                    <p className="font-medium">{selectedItems[0].description || 'No description'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Format:</span>
                                    <p className="font-medium">{selectedItems[0].format.toUpperCase()}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Size:</span>
                                    <p className="font-medium">{formatFileSize(selectedItems[0].bytes)}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Tags:</span>
                                    <p className="font-medium">{selectedItems[0].tags?.join(', ') || 'No tags'}</p>
                                </div>
                                {selectedItems[0].width && selectedItems[0].height && (
                                    <div>
                                        <span className="text-muted-foreground">Dimensions:</span>
                                        <p className="font-medium">
                                            {selectedItems[0].width} × {selectedItems[0].height} pixels
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-muted-foreground">uploaded on:</span>
                                    <p className="font-medium">{formatDate(selectedItems[0].createdAt)}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Public ID:</span>
                                    <p className="font-medium font-mono text-xs break-all">
                                        {selectedItems[0].publicId}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">URL:</span>
                                    <div className="flex items-center gap-2">
                                        <p className="font-mono text-xs break-all flex-1">
                                            {selectedItems[0].secureUrl}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleCopyUrl(selectedItems[0].secureUrl)}
                                            className="p-1 rounded hover:bg-accent"
                                            title="Copy URL"
                                        >
                                            <Icon name="hi/HiClipboardCopy" size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog - Desktop */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedItems.length} selected {selectedItems.length === 1 ? 'item' : 'items'}?
                            This action cannot be undone and will permanently remove {selectedItems.length === 1 ? 'this item' : 'these items'} from your gallery.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : `Delete ${selectedItems.length === 1 ? 'Item' : 'Items'}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Dialog - Desktop */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Edit Media Details</DialogTitle>
                        <DialogDescription>
                            Update the title, description, and tags for this media item.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={editFormData.title}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Enter title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={editFormData.description}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter description"
                                rows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tags">Tags</Label>
                            <InputTags
                                value={editFormData.tags}
                                onChange={(tags) => setEditFormData(prev => ({ ...prev, tags }))}
                                placeholder="Add tags (comma separated)"
                            />
                            <p className="text-xs text-muted-foreground">
                                Press Enter or comma to add tags
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowEditDialog(false)}
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                    Saving...
                                </span>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

/**
 * Mobile MediaPanel Component
 * Bottom sheet style panel for mobile devices
 */
export function MobileMediaPanel({
    selectedItems,
    onClose,
    onDelete,
    onEdit: _onEdit,
    onClearSelection: _onClearSelection,
    isDeleting = false,
    className,
}: MediaPanelProps) {
    const hasSelection = selectedItems.length > 0;
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    /**
     * Handle bulk delete - show confirmation dialog
     */
    const handleBulkDelete = useCallback(() => {
        if (selectedItems.length === 0) return;
        setShowDeleteDialog(true);
    }, [selectedItems.length]);

    /**
     * Confirm and execute delete
     */
    const confirmDelete = useCallback(() => {
        const ids = selectedItems.map(item => item.id);
        onDelete(ids);
        setShowDeleteDialog(false);
    }, [selectedItems, onDelete]);

    if (!hasSelection) {
        return null;
    }

    return (
        <>
            <div
                className={cn(
                    'fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50',
                    'lg:hidden', // Show only on mobile
                    className
                )}
            >
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">
                            {selectedItems.length} Selected
                        </h2>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="p-1 rounded hover:bg-accent"
                            aria-label="Close panel"
                        >
                            <Icon name="lu/LuX" size={16} className="mr-2" />
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg disabled:opacity-50"
                        >
                            {isDeleting ? (
                                'Deleting...'
                            ) : (
                                <>
                                    <Icon name="hi/HiTrash" size={16} className="mr-2" />
                                    Delete
                                </>
                            )}
                        </Button>

                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog - Mobile */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedItems.length} selected {selectedItems.length === 1 ? 'item' : 'items'}?
                            This action cannot be undone and will permanently remove {selectedItems.length === 1 ? 'this item' : 'these items'} from your gallery.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : `Delete ${selectedItems.length === 1 ? 'Item' : 'Items'}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}