/**
 * UploadSheet Component
 * 
 * Dialog/sheet component for uploading media files.
 * Integrates UploadDropzone with upload mutation and progress tracking.
 * 
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { UploadSheetProps } from './types';
import { UploadDropzone } from './UploadDropzone';
import { useMediaUpload } from '@/lib/hooks/useMediaUpload';
import { getUserId } from '@/lib/auth/authUtils';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';

/**
 * Upload progress indicator component
 */
function UploadProgress({ filesCount }: { filesCount: number }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="relative">
                {/* Spinning loader */}
                <div className="animate-spin">
                    <Icon name="lu:LuLoader2" size={48} className="text-primary" />
                </div>
            </div>

            <div className="text-center">
                <p className="text-sm font-medium mb-1">
                    Uploading {filesCount} file{filesCount !== 1 ? 's' : ''}...
                </p>
                <p className="text-xs text-muted-foreground">
                    Please wait while your files are being uploaded
                </p>
            </div>
        </div>
    );
}

/**
 * Upload success indicator component
 */
function UploadSuccess({ filesCount, onClose }: { filesCount: number; onClose: () => void }) {
    useEffect(() => {
        // Auto-close after 2 seconds
        const timer = setTimeout(() => {
            onClose();
        }, 2000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="p-4 rounded-full bg-green-500/10">
                <Icon name="lu:LuCheckCircle2" size={48} className="text-green-500" />
            </div>

            <div className="text-center">
                <p className="text-sm font-medium mb-1">
                    Upload Successful!
                </p>
                <p className="text-xs text-muted-foreground">
                    {filesCount} file{filesCount !== 1 ? 's' : ''} uploaded successfully
                </p>
            </div>
        </div>
    );
}

/**
 * Upload error indicator component
 * Requirements: 9.1, 9.2, 9.3
 */
function UploadError({ error, onRetry, onClose }: { error: string; onRetry: () => void; onClose: () => void }) {
    // Determine error type and icon
    const getErrorIcon = () => {
        if (error.includes('Cloudinary API key') || error.includes('Configuration')) {
            return 'lu:LuSettings';
        } else if (error.includes('file size') || error.includes('10MB')) {
            return 'lu:LuFileWarning';
        } else if (error.includes('file type') || error.includes('unsupported')) {
            return 'lu:LuFileX';
        } else if (error.includes('Network') || error.includes('connection')) {
            return 'lu:LuWifiOff';
        } else if (error.includes('timeout')) {
            return 'lu:LuClock';
        } else if (error.includes('Authentication')) {
            return 'lu:LuShieldAlert';
        } else if (error.includes('permission')) {
            return 'lu:LuLock';
        }
        return 'lu:LuAlertCircle';
    };

    // Get error title
    const getErrorTitle = () => {
        if (error.includes('Cloudinary API key')) {
            return 'Configuration Required';
        } else if (error.includes('file size') || error.includes('10MB')) {
            return 'File Too Large';
        } else if (error.includes('file type') || error.includes('unsupported')) {
            return 'Invalid File Type';
        } else if (error.includes('Network') || error.includes('connection')) {
            return 'Network Error';
        } else if (error.includes('timeout')) {
            return 'Upload Timeout';
        } else if (error.includes('Authentication')) {
            return 'Authentication Required';
        } else if (error.includes('permission')) {
            return 'Permission Denied';
        }
        return 'Upload Failed';
    };

    // Get help text based on error type
    const getHelpText = () => {
        if (error.includes('Cloudinary API key')) {
            return 'Please configure your Cloudinary API keys in the settings to enable uploads.';
        } else if (error.includes('file size')) {
            return 'Try compressing your files or uploading smaller files (max 10MB each).';
        } else if (error.includes('file type')) {
            return 'Supported formats: Images (JPG, PNG, GIF, WebP), Videos (MP4, MOV, WebM), PDFs.';
        } else if (error.includes('Network')) {
            return 'Check your internet connection and try again.';
        } else if (error.includes('timeout')) {
            return 'Try uploading fewer files at once or check your connection speed.';
        }
        return null;
    };

    const errorIcon = getErrorIcon();
    const errorTitle = getErrorTitle();
    const helpText = getHelpText();

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="p-4 rounded-full bg-destructive/10">
                <Icon name={errorIcon} size={48} className="text-destructive" />
            </div>

            <div className="text-center max-w-md">
                <p className="text-sm font-medium mb-1 text-destructive">
                    {errorTitle}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                    {error}
                </p>
                {helpText && (
                    <p className="text-xs text-muted-foreground/80 italic">
                        {helpText}
                    </p>
                )}
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onRetry}
                    className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                >
                    <Icon name="lu:LuRefreshCw" size={16} className="mr-2" />
                    Try Again
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                    )}
                >
                    Close
                </button>
            </div>
        </div>
    );
}

/**
 * UploadSheet Component
 * Main upload dialog with state management
 */
export function UploadSheet({
    isOpen,
    onClose,
    onUpload,
    acceptedTypes,
    maxFiles,
    maxSize,
}: UploadSheetProps) {
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploadError, setUploadError] = useState<string>('');
    const previousFocusRef = React.useRef<HTMLElement | null>(null);

    const uploadMutation = useMediaUpload({
        showToast: false, // We'll handle notifications in the component
        acceptedTypes,
        maxSize,
        maxFiles,
        onMutate: (files) => {
            // Optimistic UI: immediately show files as uploading
            setPendingFiles(files);
            setUploadState('uploading');
        },
        onSettled: () => {
            // Clear pending files after upload completes (success or error)
            // This will be called after onSuccess or onError
        },
    });

    /**
     * Reset state when dialog opens/closes
     * Store and restore focus for accessibility
     */
    useEffect(() => {
        if (isOpen) {
            // Store the currently focused element before opening
            previousFocusRef.current = document.activeElement as HTMLElement;
        } else {
            // Reset state when closing
            const timer = setTimeout(() => {
                setUploadState('idle');
                setPendingFiles([]);
                setUploadError('');

                // Return focus to the element that opened the dialog
                if (previousFocusRef.current) {
                    previousFocusRef.current.focus();
                }
            }, 300); // Wait for dialog close animation

            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    /**
     * Handle file drop from UploadDropzone
     */
    const handleDrop = async (files: File[]) => {
        const userId = getUserId();

        if (!userId) {
            setUploadError('Please log in to upload files');
            setUploadState('error');
            return;
        }

        // Call parent onUpload callback immediately for optimistic UI
        onUpload(files);

        setPendingFiles(files);
        setUploadState('uploading');
        setUploadError('');

        try {
            // Upload files using mutation
            await uploadMutation.mutateAsync({
                files,
                userId,
            });

            // Show success state
            setUploadState('success');
        } catch (error) {
            // Show error state
            const errorMessage = error instanceof Error ? error.message : 'Failed to upload files';
            setUploadError(errorMessage);
            setUploadState('error');
        }
    };

    /**
     * Handle retry after error
     */
    const handleRetry = () => {
        setUploadState('idle');
        setUploadError('');
    };

    /**
     * Handle close with state reset
     */
    const handleClose = () => {
        if (uploadState !== 'uploading') {
            onClose();
        }
    };

    /**
     * Handle escape key to close dialog
     */
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && uploadState !== 'uploading') {
                handleClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, uploadState]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Upload Media</DialogTitle>
                    <DialogDescription>
                        Upload images, videos, or PDFs to your gallery
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {/* Idle state - show dropzone */}
                    {uploadState === 'idle' && (
                        <UploadDropzone
                            onDrop={handleDrop}
                            acceptedTypes={acceptedTypes}
                            maxFiles={maxFiles}
                            maxSize={maxSize}
                            isUploading={false}
                        />
                    )}

                    {/* Uploading state - show progress */}
                    {uploadState === 'uploading' && (
                        <UploadProgress filesCount={pendingFiles.length} />
                    )}

                    {/* Success state - show success message */}
                    {uploadState === 'success' && (
                        <UploadSuccess
                            filesCount={pendingFiles.length}
                            onClose={handleClose}
                        />
                    )}

                    {/* Error state - show error message */}
                    {uploadState === 'error' && (
                        <UploadError
                            error={uploadError}
                            onRetry={handleRetry}
                            onClose={handleClose}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
