

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MediaDetailPanelProps } from './types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';
import { getFullSizeUrl } from '@/lib/utils/imageOptimization';

export function MediaDetailPanel({
    media,
    onClose,
    onDelete,
    onCopyUrl,
}: MediaDetailPanelProps) {
    const { toast } = useToast();
    const [imageError, setImageError] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
                    <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                        <Image
                            src={getFullSizeUrl(media.secureUrl)}
                            alt={media.originalFilename || 'Media preview'}
                            fill
                            className="object-contain"
                            onError={() => setImageError(true)}
                            sizes="(max-width: 640px) 100vw, 400px"
                            priority
                        />
                    </div>
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
                    <div className="w-full h-64 flex flex-col items-center justify-center bg-muted rounded-lg gap-4">
                        <Icon name="lu:LuFileText" size={64} className="text-muted-foreground" />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(media.secureUrl, '_blank')}
                        >
                            <Icon name="lu:LuExternalLink" size={16} className="mr-2" />
                            Open PDF
                        </Button>
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

    return (
        <div className="h-full flex flex-col bg-background border-l">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Media Details</h2>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClose}
                    aria-label="Close detail panel"
                >
                    <Icon name="lu:LuX" size={20} />
                </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {/* Media Preview */}
                    <div>
                        {renderPreview()}
                    </div>

                    <Separator />

                    {/* Metadata */}
                    <div className="space-y-4">
                        {/* Filename */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Filename
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                                <Icon name={getMediaTypeIcon()} size={16} className="text-muted-foreground" />
                                <p className="text-sm break-all">
                                    {media.originalFilename || 'Untitled'}
                                </p>
                            </div>
                        </div>

                        {/* File Size */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Size
                            </label>
                            <p className="text-sm mt-1">{formatFileSize(media.bytes)}</p>
                        </div>

                        {/* Upload Date */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Uploaded
                            </label>
                            <p className="text-sm mt-1">{formatDate(media.createdAt)}</p>
                        </div>

                        {/* Dimensions (for images and videos) */}
                        {(media.width && media.height) && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                    Dimensions
                                </label>
                                <p className="text-sm mt-1">
                                    {media.width} × {media.height} px
                                </p>
                            </div>
                        )}

                        {/* Format */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Format
                            </label>
                            <p className="text-sm mt-1 uppercase">{media.format}</p>
                        </div>

                        {/* URL */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                URL
                            </label>
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
