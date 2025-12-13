/**
 * MediaCard Component
 * 
 * Individual media item with preview, selection, and actions.
 * Displays media preview with selection checkbox and hover actions.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MediaCardProps } from './types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';
import { getThumbnailUrl } from '@/lib/utils/imageOptimization';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
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


export function MediaCard({
    media,
    isSelected,
    onSelect,
    onDelete,
    onClick,
}: MediaCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [numPages, setNumPages] = useState<number>(1);
    const [pageNumber, setPageNumber] = useState<number>(1);
    // Handle click with multi-select support (Ctrl/Cmd key)
    const handleClick = (e: React.MouseEvent) => {
        const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
        onSelect(media.id, isMultiSelect);
    };

    // Handle checkbox click (always multi-select)
    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(media.id, true);
    };

    // Handle delete button click
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(media.id);
        }
    };

    // Handle view button click
    const handleView = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(media);
    };

    const onDocumentLoadSuccess = (pdf: any): void => {
        setNumPages(pdf.numPages);
        setPageNumber(1);
    };

    const changePage = (offset: number) => {
        setPageNumber(prevPageNumber => prevPageNumber + offset);
    };

    const nextPage = (e: React.MouseEvent) => {
        e.stopPropagation();
        changePage(1);
    };

    const prevPage = (e: React.MouseEvent) => {
        e.stopPropagation();
        changePage(-1);
    };

    // Get optimized thumbnail URL
    const thumbnailUrl = media.thumbnailUrl || getThumbnailUrl(media.secureUrl, 300, 300);

    // Render media preview based on type
    const renderPreview = () => {
        if (imageError) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Icon name="lu:LuFileQuestion" size={48} className="text-muted-foreground" />
                </div>
            );
        }

        switch (media.mediaType) {
            case 'image':
                return (
                    <Image
                        src={thumbnailUrl}
                        alt={media.originalFilename || 'Media item'}
                        fill
                        className="object-cover"
                        onError={() => setImageError(true)}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        loading="lazy"
                    />
                );
            case 'video':
                return (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        <video
                            src={thumbnailUrl}
                            className="w-full h-full object-contain"
                            controls
                            preload="metadata"
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );
            case 'pdf':
                return (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                        <div className="relative group pdf-container w-full h-full">
                            <PDFDocument file={thumbnailUrl} onLoadSuccess={onDocumentLoadSuccess}>
                                <PDFPage
                                    pageNumber={pageNumber}
                                    width={300}
                                    className="w-full h-full"
                                />
                            </PDFDocument>
                            <div className="absolute flex justify-center min-w-[155px] leading-10 bottom-2 left-1/2 transform -translate-x-1/2 z-10 text-center p-1 bg-white/90 dark:bg-gray-800/90 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    className="p-0 rounded-md px-2 text-xs h-7"
                                    variant="ghost"
                                    size="sm"
                                    onClick={prevPage}
                                    disabled={pageNumber <= 1}
                                >
                                    <Icon name="lu:LuChevronLeft" size={14} />
                                </Button>
                                <span className="px-2 text-xs flex items-center">{`${pageNumber}/${numPages}`}</span>
                                <Button
                                    className="p-0 rounded-md px-2 text-xs h-7"
                                    variant="ghost"
                                    size="sm"
                                    onClick={nextPage}
                                    disabled={pageNumber >= numPages}
                                >
                                    <Icon name="lu:LuChevronRight" size={14} />
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Icon name="lu:LuFile" size={48} className="text-muted-foreground" />
                    </div>
                );
        }
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    /**
     * Handle keyboard navigation
     * Space: Toggle selection
     * Enter: Open detail panel (single select)
     */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ' ') {
            // Space bar: toggle selection
            e.preventDefault();
            onSelect(media.id, true);
        } else if (e.key === 'Enter') {
            // Enter: open detail panel (single select)
            e.preventDefault();
            onClick(media);
        }
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
            aria-label={`${media.originalFilename || 'media item'}. ${isSelected ? 'Selected' : 'Not selected'}. Press Space to toggle selection, Enter to view details.`}
            aria-pressed={isSelected}
            onKeyDown={handleKeyDown}
        >
            {/* Media Preview */}
            <div className="relative w-full" style={{ aspectRatio: media.width && media.height ? `${media.width}/${media.height}` : '1' }}>
                {renderPreview()}
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
                            ? 'bg-primary border-primary'
                            : 'bg-background/80 border-border backdrop-blur-sm'
                    )}
                >
                    {isSelected && (
                        <Icon name="lu:LuCheck" size={14} className="text-primary-foreground" />
                    )}
                </div>
            </div>

            {/* Hover Actions */}
            <div
                className={cn(
                    'absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition-opacity',
                    isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
            >
                <Button
                    size="icon-sm"
                    variant="secondary"
                    onClick={handleView}
                    aria-label="View details"
                >
                    <Icon name="lu:LuEye" size={16} aria-hidden="true" />
                </Button>
                {onDelete && (
                    <Button
                        size="icon-sm"
                        variant="destructive"
                        onClick={handleDelete}
                        aria-label="Delete media"
                    >
                        <Icon name="lu:LuTrash2" size={16} aria-hidden="true" />
                    </Button>
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
                    {media.originalFilename || 'Untitled'}
                </p>
                <p className="text-white/70 text-xs">
                    {formatFileSize(media.bytes)}
                </p>
            </div>
        </div>
    );
}
