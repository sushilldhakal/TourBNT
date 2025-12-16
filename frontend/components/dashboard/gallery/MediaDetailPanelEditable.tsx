/**
 * MediaDetailPanelEditable Component
 * 
 * Enhanced detail panel with editable metadata (title, description, tags).
 * Includes image editing capabilities, PDF viewing, and SEO tag management.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MediaDetailPanelProps } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';
import { getFullSizeUrl } from '@/lib/utils/imageOptimization';
import { InputTags } from '@/components/ui/input-tags';
import { useMediaUpdate } from '@/lib/hooks/useMediaUpdate';
import { useMediaUpload } from '@/lib/hooks/useMediaUpload';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/hooks/useAuth';

// Dynamically import the ImageEditorWrapper to avoid SSR issues
const ImageEditorWrapper = dynamic(
    () => import('./ImageEditorWrapper'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading image editor...</p>
                </div>
            </div>
        )
    }
);

// Image editor constants removed - editor temporarily disabled

// Dynamically import PDF components to avoid SSR issues
const PDFDocument = dynamic(
    () => import('react-pdf').then((mod) => {
        // Configure PDF.js worker
        mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
        return mod.Document;
    }),
    { ssr: false }
);

const PDFPage = dynamic(
    () => import('react-pdf').then((mod) => mod.Page),
    { ssr: false }
);
interface FormValues {
    title: string;
    description: string;
    tags: string[];
}

export function MediaDetailPanelEditable({
    media,
    onClose,
    onDelete,
    onCopyUrl,
}: MediaDetailPanelProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [imageError, setImageError] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Image editor state
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [editedImageFile, setEditedImageFile] = useState<File | null>(null);
    const [isImgEditorShown, setIsImgEditorShown] = useState(false);
    const [changesMade, setChangesMade] = useState(false);

    // PDF viewer state
    const [numPages, setNumPages] = useState<number>(1);
    const [pageNumber, setPageNumber] = useState<number>(1);

    // Form state
    const [formValues, setFormValues] = useState<FormValues>({
        title: media.title || media.originalFilename || '',
        description: media.description || '',
        tags: media.tags || [],
    });

    // Reset form when media changes
    useEffect(() => {
        setFormValues({
            title: media.title || media.originalFilename || '',
            description: media.description || '',
            tags: media.tags || [],
        });
    }, [media]);

    const updateMutation = useMediaUpdate({
        onSuccess: () => {
            setIsEditing(false);
        },
    });

    const uploadMutation = useMediaUpload({
        onSuccess: () => {
            toast({
                variant: 'success',
                title: 'Upload Successful',
                description: 'Your edited image has been uploaded.',
            });
            setChangesMade(false);
            setEditedImageFile(null);
            setShowImageEditor(false);
            setIsImgEditorShown(false);
        },
        onError: (error) => {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: error.message || 'Failed to upload edited image',
            });
        },
    });

    /**
     * Format file size in human-readable format
     */
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    /**
     * Format date in readable format
     */
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    /**
     * Handle copy URL button click
     */
    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(media.secureUrl);
            onCopyUrl(media.secureUrl);
            toast({
                title: 'URL Copied',
                description: 'Media URL has been copied to clipboard',
            });
        } catch (error) {
            toast({
                title: 'Copy Failed',
                description: 'Failed to copy URL to clipboard',
                variant: 'destructive',
            });
        }
    };

    /**
     * Handle delete button click
     */
    const handleDelete = () => {
        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }
        onDelete(media.id);
        setShowDeleteConfirm(false);
    };

    /**
     * Handle image editor save
     */
    const handleImageEditorSave = (editedImageObject: any) => {
        // Convert base64 to File
        const base64 = editedImageObject.imageBase64;
        const byteString = atob(base64.split(',')[1]);
        const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const file = new File([blob], `edited-${media.originalFilename || 'image.jpg'}`, {
            type: mimeString,
        });

        setEditedImageFile(file);
        setChangesMade(true);

        toast({
            title: 'Image Edited',
            description: 'Image has been edited. Click Upload to save changes.',
        });
    };

    /**
     * Handle upload changes
     */
    /**
     * Handle upload changes
     */
    const handleUploadChange = async () => {
        if (!editedImageFile) {
            toast({
                variant: 'destructive',
                title: 'No Changes',
                description: 'No edited image to upload',
            });
            return;
        }

        if (!user?.id) {
            toast({
                variant: 'destructive',
                title: 'Authentication Required',
                description: 'Please log in to upload media',
            });
            return;
        }

        // Upload the edited image
        uploadMutation.mutate({
            files: [editedImageFile],
        });
    };

    /**
     * Open image editor
     */
    const openImgEditor = () => {
        setIsImgEditorShown(true);
        setShowImageEditor(true);
    };

    /**
     * Close image editor
     */
    const closeImgEditor = () => {
        setIsImgEditorShown(false);
        setShowImageEditor(false);
    };

    /**
     * Handle PDF document load
     */
    const onDocumentLoadSuccess = (pdf: any): void => {
        setNumPages(pdf.numPages);
        setPageNumber(1);
    };

    /**
     * Navigate PDF pages
     */
    const changePage = (offset: number) => {
        setPageNumber((prevPageNumber) => prevPageNumber + offset);
    };

    const nextPage = () => {
        changePage(1);
    };

    const prevPage = () => {
        changePage(-1);
    };

    /**
     * Handle form submission
     */
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            toast({
                variant: 'destructive',
                title: 'Authentication Required',
                description: 'Please log in to update media',
            });
            return;
        }

        // Determine media type for API
        let mediaType = 'images';
        if (media.mediaType === 'video') mediaType = 'videos';
        else if (media.mediaType === 'pdf') mediaType = 'PDF';

        updateMutation.mutate({
            imageId: media.id,
            mediaType,
            title: formValues.title,
            description: formValues.description,
            tags: formValues.tags,
        });
    };

    /**
     * Render media preview based on type
     */
    const renderPreview = () => {
        if (imageError) {
            return (
                <div className="w-full h-64 flex items-center justify-center bg-muted rounded-lg">
                    <Icon name="lu:LuFileQuestion" size={64} className="text-muted-foreground" />
                </div>
            );
        }

        switch (media.mediaType) {
            case 'image':
                return (
                    <>
                        {/* Image Editor Dialog */}
                        <Dialog modal={false} open={showImageEditor} onOpenChange={(open) => {
                            setShowImageEditor(open);
                            if (open) {
                                setIsImgEditorShown(true);
                            } else {
                                closeImgEditor();
                            }
                        }}>
                            <DialogTrigger asChild>
                                <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden group cursor-pointer">
                                    <Image
                                        src={getFullSizeUrl(media.secureUrl)}
                                        alt={media.originalFilename || 'Media preview'}
                                        fill
                                        className="object-contain"
                                        onError={() => setImageError(true)}
                                        sizes="(max-width: 640px) 100vw, 400px"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="secondary" size="sm" type="button">
                                            <Icon name="lu:LuPencil" size={16} className="mr-2" />
                                            Edit Image
                                        </Button>
                                    </div>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-hidden" style={{ zIndex: 100 }}>
                                <DialogHeader>
                                    <DialogTitle className="break-words">Edit Image</DialogTitle>
                                    <DialogDescription>
                                        Make changes to your image here. Click save when you're done.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-center gap-4 py-4 h-[600px] overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
                                    {isImgEditorShown && (
                                        <div className="w-full h-full">
                                            <ImageEditorWrapper
                                                source={media.secureUrl}
                                                onSave={(editedImageObject: any) => {
                                                    handleImageEditorSave(editedImageObject);
                                                }}
                                                onClose={closeImgEditor}
                                            />
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button
                                        onClick={handleUploadChange}
                                        disabled={!changesMade || uploadMutation.isPending}
                                    >
                                        {uploadMutation.isPending ? (
                                            <>
                                                <Icon name="lu:LuLoader2" size={16} className="mr-2 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            'Upload changes'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Show edited image notification */}
                        {editedImageFile && (
                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                                <p className="text-sm text-blue-900 dark:text-blue-100">
                                    <Icon name="lu:LuInfo" size={14} className="inline mr-1" />
                                    Image edited. Click Upload to save changes.
                                </p>
                            </div>
                        )}
                    </>
                );
            case 'video':
                return (
                    <div className="w-full rounded-lg overflow-hidden bg-black">
                        <video
                            src={media.secureUrl}
                            controls
                            className="w-full h-64 object-contain"
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );
            case 'pdf':
                return (
                    <div className="w-full bg-muted rounded-lg overflow-hidden">
                        <div className="relative group">
                            <PDFDocument file={media.secureUrl} onLoadSuccess={onDocumentLoadSuccess}>
                                <PDFPage
                                    pageNumber={pageNumber}
                                    width={350}
                                    className="mx-auto"
                                />
                            </PDFDocument>
                            {/* PDF Navigation Controls */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-md shadow-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={prevPage}
                                    disabled={pageNumber <= 1}
                                >
                                    <Icon name="lu:LuChevronLeft" size={16} />
                                </Button>
                                <span className="text-sm px-2">
                                    {pageNumber} / {numPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={nextPage}
                                    disabled={pageNumber >= numPages}
                                >
                                    <Icon name="lu:LuChevronRight" size={16} />
                                </Button>
                            </div>
                        </div>
                        <div className="p-2 text-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(media.secureUrl, '_blank')}
                            >
                                <Icon name="lu:LuExternalLink" size={16} className="mr-2" />
                                Open Full PDF
                            </Button>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="w-full h-64 flex items-center justify-center bg-muted rounded-lg">
                        <Icon name="lu:LuFile" size={64} className="text-muted-foreground" />
                    </div>
                );
        }
    };

    /**
     * Get media type icon
     */
    const getMediaTypeIcon = () => {
        switch (media.mediaType) {
            case 'image':
                return 'lu:LuImage';
            case 'video':
                return 'lu:LuVideo';
            case 'pdf':
                return 'lu:LuFileText';
            default:
                return 'lu:LuFile';
        }
    };

    /**
     * Get SEO tags (use tags if available, otherwise use title)
     */
    const getSeoTags = () => {
        if (media.tags && media.tags.length > 0) {
            return media.tags.join(', ');
        }
        return media.title || media.originalFilename || 'No tags';
    };

    return (
        <div className="h-full flex flex-col bg-background border-l">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Media Details</h2>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormValues({
                                        title: media.title || media.originalFilename || '',
                                        description: media.description || '',
                                        tags: media.tags || [],
                                    });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleFormSubmit}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Icon name="lu:LuLoader2" size={16} className="mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="lu:LuCheck" size={16} className="mr-2" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                        >
                            <Icon name="lu:LuPencil" size={16} className="mr-2" />
                            Edit
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onClose}
                        aria-label="Close detail panel"
                    >
                        <Icon name="lu:LuX" size={20} />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {/* Media Preview */}
                    <div>
                        {renderPreview()}
                    </div>

                    <Separator />

                    {/* Editable Metadata Form */}
                    <form className="space-y-4" onSubmit={handleFormSubmit}>
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            {isEditing ? (
                                <Input
                                    value={formValues.title}
                                    onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                                    placeholder="Enter title"
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Icon name={getMediaTypeIcon()} size={16} className="text-muted-foreground" />
                                    <p className="text-sm break-all">
                                        {formValues.title || 'Untitled'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            {isEditing ? (
                                <Textarea
                                    value={formValues.description}
                                    onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                                    placeholder="Enter description"
                                    rows={3}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {formValues.description || 'No description'}
                                </p>
                            )}
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tags (SEO)</label>
                            {isEditing ? (
                                <InputTags
                                    value={formValues.tags}
                                    onChange={(tags) => setFormValues({ ...formValues, tags })}
                                    placeholder="Add tags for SEO"
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {getSeoTags()}
                                </p>
                            )}
                        </div>
                    </form>

                    <Separator />

                    {/* File Information */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">File Information</p>

                        {/* File Size */}
                        <div>
                            <label className="text-xs text-muted-foreground">Size</label>
                            <p className="text-sm">{formatFileSize(media.bytes)}</p>
                        </div>

                        {/* Upload Date */}
                        <div>
                            <label className="text-xs text-muted-foreground">Uploaded</label>
                            <p className="text-sm">{formatDate(media.createdAt)}</p>
                        </div>

                        {/* Dimensions (for images and videos) */}
                        {(media.width && media.height) && (
                            <div>
                                <label className="text-xs text-muted-foreground">Dimensions</label>
                                <p className="text-sm">
                                    {media.width} × {media.height} px
                                </p>
                            </div>
                        )}

                        {/* Format */}
                        <div>
                            <label className="text-xs text-muted-foreground">Format</label>
                            <p className="text-sm uppercase">{media.format}</p>
                        </div>

                        {/* URL */}
                        <div>
                            <label className="text-xs text-muted-foreground">URL</label>
                            <div className="mt-1 p-2 bg-muted rounded text-xs break-all font-mono">
                                {media.secureUrl}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="space-y-2">
                        {/* Copy URL Button */}
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleCopyUrl}
                            aria-label="Copy media URL to clipboard"
                        >
                            <Icon name="lu:LuCopy" size={16} className="mr-2" aria-hidden="true" />
                            Copy URL
                        </Button>

                        {/* Delete Button */}
                        <Button
                            variant={showDeleteConfirm ? 'destructive' : 'outline'}
                            className={cn(
                                'w-full justify-start',
                                showDeleteConfirm && 'text-destructive-foreground'
                            )}
                            onClick={handleDelete}
                            aria-label={showDeleteConfirm ? 'Confirm deletion' : 'Delete media item'}
                        >
                            <Icon name="lu:LuTrash2" size={16} className="mr-2" aria-hidden="true" />
                            {showDeleteConfirm ? 'Click again to confirm' : 'Delete'}
                        </Button>

                        {/* Cancel delete confirmation */}
                        {showDeleteConfirm && (
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => setShowDeleteConfirm(false)}
                                aria-label="Cancel deletion"
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
