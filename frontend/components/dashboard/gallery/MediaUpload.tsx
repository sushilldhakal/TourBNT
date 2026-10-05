/**
 * MediaUpload Component
 * 
 * Complete upload solution consolidating all upload functionality:
 * - Trigger button (AddMediaButton)
 * - Dialog wrapper (UploadDialog)
 * - Drag-and-drop zone (FileDropZone/UploadZone)
 * - File preview list (FilePreviewList)
 * - Upload progress tracking (UploadProgress)
 * 
 * This single file replaces:
 * - AddMediaButton.tsx
 * - FileDropZone.tsx
 * - UploadZone.tsx
 * - FilePreviewList.tsx
 * - UploadDialog.tsx
 * - UploadProgress.tsx
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/Icon';
import { cn } from '@/lib/utils';

import type { FileUploadProgress, MediaUploadProps, MediaUploadButtonProps } from '@/types/gallery';

export type { FileUploadProgress, MediaUploadProps, MediaUploadButtonProps } from '@/types/gallery';

// ============================================================================
// MediaUploadButton Component (formerly AddMediaButton)
// ============================================================================

export function MediaUploadButton({
    onClick,
    disabled = false,
    className,
    children = 'Add Media',
}: MediaUploadButtonProps) {
    const handleClick = () => {
        if (!disabled) {
            onClick();
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
            event.preventDefault();
            onClick();
        }
    };

    return (
        <Button
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            variant="default"
            size="default"
            className={cn(
                'min-h-[44px] min-w-[44px]',
                'sm:min-h-[40px] sm:min-w-auto',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-all duration-200',
                className
            )}
            aria-label="Add media files"
            title="Add media files"
        >
            <Icon
                name="hi/HiPlus"
                size={18}
                className="mr-2"
                aria-hidden="true"
            />
            {children}
        </Button>
    );
}

// ============================================================================
// Internal Components
// ============================================================================

/**
 * FileDropZone - Drag-and-drop zone for file selection
 */
interface FileDropZoneProps {
    onFilesSelected: (files: File[]) => void;
    acceptedTypes: Record<string, string[]>;
    maxFiles: number;
    maxSize: number;
    disabled?: boolean;
    className?: string;
}

function FileDropZone({
    onFilesSelected,
    acceptedTypes,
    maxFiles,
    maxSize,
    disabled = false,
    className,
}: FileDropZoneProps) {
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatAcceptedTypes = (): string => {
        const extensions = Object.values(acceptedTypes).flat();
        return extensions.join(', ').toUpperCase();
    };

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || disabled) return;
        const fileArray = Array.from(files);
        onFilesSelected(fileArray);
    }, [onFilesSelected, disabled]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragIn = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setDragActive(true);
        }
    }, [disabled]);

    const handleDragOut = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    }, [handleFileSelect, disabled]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
        if (e.target) {
            e.target.value = '';
        }
    };

    const handleBrowseClick = () => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            handleBrowseClick();
        }
    };

    return (
        <div
            className={cn(
                'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
                dragActive
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                disabled && 'opacity-50 pointer-events-none cursor-not-allowed',
                !disabled && 'cursor-pointer hover:bg-muted/20',
                className
            )}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-label="Drop files here or click to browse"
            aria-disabled={disabled}
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={Object.keys(acceptedTypes).join(',')}
                onChange={handleFileInputChange}
                className="sr-only"
                disabled={disabled}
                aria-hidden="true"
            />

            <div className="space-y-4">
                <div className={cn(
                    'mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors',
                    dragActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                )}>
                    <Icon
                        name={dragActive ? 'hi/HiUpload' : 'hi/HiFolderAdd'}
                        size={28}
                        aria-hidden="true"
                    />
                </div>

                <div className="space-y-2">
                    <p className="text-lg font-medium">
                        {dragActive ? 'Drop files here' : 'Drop files here or click to browse'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Maximum {maxFiles} files, {formatFileSize(maxSize)} each
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBrowseClick}
                    disabled={disabled}
                    className="pointer-events-auto"
                    aria-label="Browse files"
                >
                    <Icon name="hi/HiFolderOpen" size={16} className="mr-2" />
                    Browse Files
                </Button>

                <div className="pt-2 border-t border-muted-foreground/10">
                    <p className="text-xs text-muted-foreground">
                        <Icon name="hi/HiInformationCircle" size={12} className="inline mr-1" />
                        Supported formats: {formatAcceptedTypes()}
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * FilePreviewList - Displays selected files with previews
 */
interface FilePreviewListProps {
    files: File[];
    onRemoveFile: (index: number) => void;
    validationErrors?: Record<number, string>;
    disabled?: boolean;
    className?: string;
}

function FilePreviewList({
    files,
    onRemoveFile,
    validationErrors = {},
    disabled = false,
    className,
}: FilePreviewListProps) {
    const [previews, setPreviews] = useState<Record<number, string>>({});

    useEffect(() => {
        const newPreviews: Record<number, string> = {};

        files.forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                newPreviews[index] = url;
            }
        });

        // Blob URLs only exist in the browser, so the preview map is filled from this effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs React state to URL.createObjectURL
        setPreviews(newPreviews);

        return () => {
            Object.values(newPreviews).forEach(url => {
                URL.revokeObjectURL(url);
            });
        };
    }, [files]);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileTypeIcon = (file: File): string => {
        if (file.type.startsWith('image/')) return 'hi/HiPhotograph';
        if (file.type.startsWith('video/')) return 'hi/HiVideoCamera';
        if (file.type === 'application/pdf') return 'hi/HiDocumentText';
        return 'hi/HiDocument';
    };

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalCount = files.length;
    const errorCount = Object.keys(validationErrors).length;

    if (files.length === 0) {
        return null;
    }

    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">
                        Selected Files ({totalCount})
                    </h4>
                    {errorCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            <Icon name="hi/HiExclamationCircle" size={12} className="mr-1" />
                            {errorCount} error{errorCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    Total: {formatFileSize(totalSize)}
                </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => {
                    const hasError = validationErrors[index];
                    const preview = previews[index];

                    return (
                        <div
                            key={`${file.name}-${index}`}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                                hasError
                                    ? 'border-destructive/50 bg-destructive/5'
                                    : 'border-border bg-muted/30',
                                disabled && 'opacity-50'
                            )}
                        >
                            <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                {preview ? (
                                    <Image
                                        src={preview}
                                        alt={`Preview of ${file.name}`}
                                        width={48}
                                        height={48}
                                        unoptimized
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Icon
                                        name={getFileTypeIcon(file)}
                                        size={20}
                                        className="text-muted-foreground"
                                    />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate" title={file.name}>
                                            {file.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-muted-foreground">
                                                {formatFileSize(file.size)}
                                            </p>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {file.type.split('/')[0] || 'Unknown'}
                                            </p>
                                        </div>

                                        {hasError && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <Icon name="hi/HiExclamationCircle" size={12} className="text-destructive" />
                                                <p className="text-xs text-destructive">
                                                    {hasError}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => onRemoveFile(index)}
                                        disabled={disabled}
                                        className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                                        aria-label={`Remove ${file.name}`}
                                    >
                                        <Icon name="hi/HiX" size={14} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {totalCount > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                    <Icon name="hi/HiInformationCircle" size={12} className="inline mr-1" />
                    Showing {Math.min(totalCount, files.length)} of {totalCount} files
                </div>
            )}
        </div>
    );
}

/**
 * UploadProgress - Displays upload progress
 */
interface UploadProgressDisplayProps {
    files: FileUploadProgress[];
    overallProgress: number;
    isComplete: boolean;
    hasErrors: boolean;
    onCancel?: () => void;
    onClose?: () => void;
    autoCloseDelay?: number;
    className?: string;
}

function UploadProgressDisplay({
    files,
    overallProgress,
    isComplete,
    hasErrors,
    onCancel,
    onClose,
    autoCloseDelay = 2000,
    className,
}: UploadProgressDisplayProps) {
    useEffect(() => {
        if (isComplete && !hasErrors && onClose && autoCloseDelay > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, autoCloseDelay);

            return () => clearTimeout(timer);
        }
    }, [isComplete, hasErrors, onClose, autoCloseDelay]);

    const getStatusIcon = (status: FileUploadProgress['status']) => {
        switch (status) {
            case 'pending':
                return <Icon name="hi/HiClock" size={16} className="text-muted-foreground" />;
            case 'uploading':
                return <Icon name="hi/HiRefresh" size={16} className="text-primary animate-spin" />;
            case 'success':
                return <Icon name="hi/HiCheckCircle" size={16} className="text-green-600" />;
            case 'error':
                return <Icon name="hi/HiXCircle" size={16} className="text-destructive" />;
            default:
                return <Icon name="hi/HiDocument" size={16} className="text-muted-foreground" />;
        }
    };

    const getOverallStatus = () => {
        if (hasErrors) return 'error';
        if (isComplete) return 'success';
        if (overallProgress > 0) return 'uploading';
        return 'pending';
    };

    const overallStatus = getOverallStatus();
    const completedFiles = files.filter(f => f.status === 'success').length;
    const errorFiles = files.filter(f => f.status === 'error').length;

    return (
        <div className={cn('space-y-4', className)}>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {getStatusIcon(overallStatus as FileUploadProgress['status'])}
                        <h4 className="text-sm font-medium">
                            {overallStatus === 'success' && 'Upload Complete!'}
                            {overallStatus === 'error' && 'Upload Failed'}
                            {overallStatus === 'uploading' && 'Uploading Files...'}
                            {overallStatus === 'pending' && 'Preparing Upload...'}
                        </h4>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {Math.round(overallProgress)}%
                    </span>
                </div>

                <Progress
                    value={overallProgress}
                    className={cn(
                        'h-2',
                        overallStatus === 'error' && '[&>div]:bg-destructive',
                        overallStatus === 'success' && '[&>div]:bg-green-600'
                    )}
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        {completedFiles} of {files.length} files completed
                        {errorFiles > 0 && ` • ${errorFiles} failed`}
                    </span>
                    {isComplete && !hasErrors && (
                        <span className="text-green-600">
                            <Icon name="hi/HiCheck" size={12} className="inline mr-1" />
                            All files uploaded successfully
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                    <div
                        key={`${file.fileName}-${index}`}
                        className={cn(
                            'flex items-center gap-3 p-2 rounded-md border',
                            file.status === 'error' && 'border-destructive/50 bg-destructive/5',
                            file.status === 'success' && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
                            file.status === 'uploading' && 'border-primary/50 bg-primary/5'
                        )}
                    >
                        <div className="flex-shrink-0">
                            {getStatusIcon(file.status)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm truncate" title={file.fileName}>
                                    {file.fileName}
                                </p>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {file.progress}%
                                </span>
                            </div>

                            {file.status === 'uploading' && (
                                <Progress
                                    value={file.progress}
                                    className="h-1 mt-1"
                                />
                            )}

                            {file.status === 'error' && file.error && (
                                <p className="text-xs text-destructive mt-1">
                                    {file.error}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
                {!isComplete && onCancel && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                    >
                        <Icon name="hi/HiX" size={14} className="mr-2" />
                        Cancel Upload
                    </Button>
                )}

                {isComplete && onClose && (
                    <Button
                        variant={hasErrors ? "outline" : "default"}
                        size="sm"
                        onClick={onClose}
                    >
                        <Icon
                            name={hasErrors ? "hi/HiX" : "hi/HiCheck"}
                            size={14}
                            className="mr-2"
                        />
                        {hasErrors ? 'Close' : 'Done'}
                    </Button>
                )}
            </div>

            {isComplete && !hasErrors && autoCloseDelay > 0 && (
                <div className="text-xs text-muted-foreground text-center">
                    <Icon name="hi/HiInformationCircle" size={12} className="inline mr-1" />
                    Dialog will close automatically in {Math.ceil(autoCloseDelay / 1000)} seconds
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main MediaUpload Component (Dialog)
// ============================================================================

export function MediaUpload({
    open,
    onOpenChange,
    onUpload,
    acceptedTypes,
    maxSize,
    maxFiles,
    isUploading = false,
    uploadProgress = [],
    overallProgress = 0,
    uploadComplete = false,
    uploadHasErrors = false,
}: MediaUploadProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
    const [wasOpen, setWasOpen] = useState(open);

    if (open !== wasOpen) {
        setWasOpen(open);
        if (!open) {
            setSelectedFiles([]);
            setValidationErrors({});
        }
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const validateFiles = (files: File[]): Record<number, string> => {
        const errors: Record<number, string> = {};

        files.forEach((file, index) => {
            if (file.size > maxSize) {
                errors[index] = `File too large. Maximum size is ${formatFileSize(maxSize)}`;
                return;
            }

            const isValidType = Object.entries(acceptedTypes).some(([mimePattern, extensions]) => {
                if (mimePattern.endsWith('/*')) {
                    const category = mimePattern.split('/')[0];
                    return file.type.startsWith(category + '/');
                }
                if (file.type === mimePattern) return true;

                return extensions.some(ext =>
                    file.name.toLowerCase().endsWith(ext.toLowerCase())
                );
            });

            if (!isValidType) {
                errors[index] = 'File type not supported';
            }
        });

        return errors;
    };

    const handleFilesSelected = (newFiles: File[]) => {
        const combinedFiles = [...selectedFiles, ...newFiles];
        const limitedFiles = combinedFiles.slice(0, maxFiles);

        setSelectedFiles(limitedFiles);
        setValidationErrors(validateFiles(limitedFiles));
    };

    const removeFile = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        setValidationErrors(validateFiles(newFiles));
    };

    const handleUpload = () => {
        const validFiles = selectedFiles.filter((_, index) => !validationErrors[index]);
        if (validFiles.length > 0) {
            onUpload(validFiles);
        }
    };

    const handleClose = () => {
        if (!isUploading) {
            setSelectedFiles([]);
            setValidationErrors({});
            onOpenChange(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && !isUploading) {
            handleClose();
        }
    };

    const validFileCount = selectedFiles.length - Object.keys(validationErrors).length;
    const canUpload = validFileCount > 0 && !isUploading;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    'w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden',
                    'sm:w-full',
                    isUploading && 'pointer-events-auto'
                )}
                onKeyDown={handleKeyDown}
                onPointerDownOutside={isUploading ? (e) => e.preventDefault() : undefined}
                onEscapeKeyDown={isUploading ? (e) => e.preventDefault() : undefined}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon name="hi/HiUpload" size={20} />
                        Add Media Files
                    </DialogTitle>
                    <DialogDescription>
                        Upload images, videos, or PDFs to your gallery.
                        Maximum {maxFiles} files, {formatFileSize(maxSize)} each.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 overflow-y-auto max-h-[60vh]">
                    {isUploading && uploadProgress.length > 0 ? (
                        <UploadProgressDisplay
                            files={uploadProgress}
                            overallProgress={overallProgress}
                            isComplete={uploadComplete}
                            hasErrors={uploadHasErrors}
                            onClose={handleClose}
                        />
                    ) : (
                        <>
                            <FileDropZone
                                onFilesSelected={handleFilesSelected}
                                acceptedTypes={acceptedTypes}
                                maxFiles={maxFiles}
                                maxSize={maxSize}
                                disabled={isUploading}
                            />

                            {selectedFiles.length > 0 && (
                                <FilePreviewList
                                    files={selectedFiles}
                                    onRemoveFile={removeFile}
                                    validationErrors={validationErrors}
                                    disabled={isUploading}
                                />
                            )}
                        </>
                    )}
                </div>

                {!isUploading && (
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!canUpload}
                            className="min-w-[100px]"
                        >
                            <Icon name="hi/HiUpload" size={16} className="mr-2" />
                            Upload {validFileCount > 0 && `(${validFileCount})`}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Default export for convenience
export default MediaUpload;
