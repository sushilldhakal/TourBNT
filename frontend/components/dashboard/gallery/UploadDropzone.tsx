/**
 * UploadDropzone Component
 * 
 * Drag-and-drop area for uploading media files.
 * Provides file validation, preview, and error display.
 * 
 * Requirements: 2.1, 2.2, 2.3
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadDropzoneProps } from './types';
import { validateFiles } from '@/lib/api/mediaApi';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';

/**
 * File preview item component
 */
function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
    const [preview, setPreview] = useState<string | null>(null);

    React.useEffect(() => {
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

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 group hover:bg-muted transition-colors">
            {/* Preview or icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-background flex items-center justify-center">
                {preview ? (
                    <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <Icon name={getFileIcon()} size={24} className="text-muted-foreground" />
                )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>

            {/* Remove button */}
            <button
                type="button"
                onClick={onRemove}
                className="flex-shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove ${file.name}`}
            >
                <Icon name="lu:LuX" size={16} />
            </button>
        </div>
    );
}

/**
 * UploadDropzone Component
 * Main drag-and-drop upload area
 */
export function UploadDropzone({
    onDrop,
    acceptedTypes,
    maxFiles,
    maxSize,
    isUploading = false,
}: UploadDropzoneProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    /**
     * Handle file drop/selection
     * Validates files and updates state
     */
    const handleDrop = useCallback(
        (acceptedFiles: File[]) => {
            // Clear previous errors
            setValidationErrors([]);

            // Validate files
            const { validFiles, errors } = validateFiles(
                acceptedFiles,
                acceptedTypes,
                maxSize,
                maxFiles
            );

            // Show validation errors
            if (errors.length > 0) {
                setValidationErrors(errors);
            }

            // Update selected files
            if (validFiles.length > 0) {
                setSelectedFiles((prev) => {
                    const combined = [...prev, ...validFiles];
                    // Ensure we don't exceed maxFiles
                    return combined.slice(0, maxFiles);
                });
            }
        },
        [acceptedTypes, maxSize, maxFiles]
    );

    /**
     * Remove file from selection
     */
    const handleRemoveFile = useCallback((index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    /**
     * Clear all selected files
     */
    const handleClearAll = useCallback(() => {
        setSelectedFiles([]);
        setValidationErrors([]);
    }, []);

    /**
     * Trigger upload with selected files
     */
    const handleUpload = useCallback(() => {
        if (selectedFiles.length > 0) {
            onDrop(selectedFiles);
            // Clear files after upload
            setSelectedFiles([]);
            setValidationErrors([]);
        }
    }, [selectedFiles, onDrop]);

    /**
     * Configure react-dropzone
     */
    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragReject,
    } = useDropzone({
        onDrop: handleDrop,
        accept: acceptedTypes,
        maxFiles,
        maxSize,
        disabled: isUploading,
        multiple: maxFiles > 1,
    });

    /**
     * Get accepted file types as readable string
     */
    const getAcceptedTypesText = () => {
        const types = Object.keys(acceptedTypes);
        const readable = types.map((type) => {
            if (type.startsWith('image/')) return 'Images';
            if (type.startsWith('video/')) return 'Videos';
            if (type === 'application/pdf') return 'PDFs';
            return type;
        });
        return readable.join(', ');
    };

    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);

    return (
        <div className="space-y-4">
            {/* Dropzone area */}
            <div
                {...getRootProps()}
                className={cn(
                    'relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
                    'flex flex-col items-center justify-center gap-4 min-h-[200px]',
                    isDragActive && !isDragReject && 'border-primary bg-primary/5',
                    isDragReject && 'border-destructive bg-destructive/5',
                    !isDragActive && 'border-muted-foreground/25 hover:border-muted-foreground/50',
                    isUploading && 'opacity-50 cursor-not-allowed'
                )}
            >
                <input {...getInputProps()} />

                {/* Icon */}
                <div className={cn(
                    'p-4 rounded-full',
                    isDragActive && !isDragReject && 'bg-primary/10',
                    isDragReject && 'bg-destructive/10',
                    !isDragActive && 'bg-muted'
                )}>
                    <Icon
                        name={isDragReject ? 'lu:LuAlertCircle' : 'lu:LuUpload'}
                        size={32}
                        className={cn(
                            isDragActive && !isDragReject && 'text-primary',
                            isDragReject && 'text-destructive',
                            !isDragActive && 'text-muted-foreground'
                        )}
                    />
                </div>

                {/* Text */}
                <div className="text-center">
                    {isDragReject ? (
                        <>
                            <p className="text-sm font-medium text-destructive">
                                Invalid file type
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Please drop valid files
                            </p>
                        </>
                    ) : isDragActive ? (
                        <>
                            <p className="text-sm font-medium text-primary">
                                Drop files here
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Release to upload
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium">
                                Drag & drop files here, or click to select
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {getAcceptedTypesText()} • Max {maxFiles} files • Up to {maxSizeMB}MB each
                            </p>
                        </>
                    )}
                </div>

                {/* Upload indicator */}
                {isUploading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="animate-spin">
                                <Icon name="lu:LuLoader2" size={24} className="text-primary" />
                            </div>
                            <span className="text-sm font-medium">Uploading...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <div className="flex items-start gap-2">
                        <Icon name="lu:LuAlertCircle" size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-destructive mb-1">
                                Validation Errors
                            </p>
                            <ul className="text-xs text-destructive/90 space-y-1">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                            Selected Files ({selectedFiles.length})
                        </p>
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Clear all
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                            <FilePreview
                                key={`${file.name}-${index}`}
                                file={file}
                                onRemove={() => handleRemoveFile(index)}
                            />
                        ))}
                    </div>

                    {/* Upload button */}
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={isUploading}
                        className={cn(
                            'w-full py-2 px-4 rounded-lg font-medium transition-colors',
                            'bg-primary text-primary-foreground hover:bg-primary/90',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                    >
                        {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            )}
        </div>
    );
}
