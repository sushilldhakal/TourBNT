/**
 * GalleryUploadExample Component
 * 
 * Example implementation showing how to use UploadSheet with optimistic UI updates.
 * This demonstrates the complete upload flow with uploadingFiles state management.
 * 
 * Requirements: 10.4
 */

'use client';

import React, { useState } from 'react';
import { UploadSheet } from './UploadSheet';
import { MediaGrid } from './MediaGrid';
import { Button } from '@/components/ui/button';

/**
 * Default accepted file types
 */
const DEFAULT_ACCEPTED_TYPES = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    'application/pdf': ['.pdf'],
};

/**
 * Example component demonstrating optimistic UI updates
 */
export function GalleryUploadExample() {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

    /**
     * Handle upload button click
     */
    const handleUploadClick = () => {
        setIsUploadOpen(true);
    };

    /**
     * Handle files being uploaded (optimistic UI)
     * This is called immediately when upload starts
     */
    const handleUpload = (files: File[]) => {
        // Show files immediately in grid (optimistic UI)
        setUploadingFiles(files);
    };

    /**
     * Handle upload completion (success or error)
     * This should be called from the parent when upload settles
     */
    const handleUploadComplete = () => {
        // Remove uploading files from optimistic UI
        setUploadingFiles([]);
        // Close upload sheet
        setIsUploadOpen(false);
    };

    return (
        <div className="space-y-4">
            {/* Upload button */}
            <div className="flex justify-end">
                <Button onClick={handleUploadClick}>
                    Upload Media
                </Button>
            </div>

            {/* Media grid with optimistic UI */}
            <MediaGrid
                mediaItems={[]} // Your actual media items from query
                selectedIds={new Set()}
                onSelect={() => { }}
                onDelete={() => { }}
                isLoading={false}
                isFetchingMore={false}
                hasMore={false}
                onLoadMore={() => { }}
                uploadingFiles={uploadingFiles} // Show uploading files immediately
            />

            {/* Upload sheet */}
            <UploadSheet
                isOpen={isUploadOpen}
                onClose={() => {
                    setIsUploadOpen(false);
                    // Clear uploading files when closing
                    setUploadingFiles([]);
                }}
                onUpload={handleUpload}
                acceptedTypes={DEFAULT_ACCEPTED_TYPES}
                maxFiles={10}
                maxSize={10 * 1024 * 1024} // 10MB
            />
        </div>
    );
}

/**
 * Usage Notes:
 * 
 * 1. Optimistic UI Flow:
 *    - User selects files in UploadSheet
 *    - onUpload is called immediately with files
 *    - Files are added to uploadingFiles state
 *    - MediaGrid shows UploadingCard components
 *    - When upload completes, uploadingFiles is cleared
 *    - MediaGrid refetches and shows actual uploaded items
 * 
 * 2. Integration with React Query:
 *    - The useMediaUpload hook handles the actual upload
 *    - It invalidates queries on success
 *    - MediaGrid will automatically refetch and update
 * 
 * 3. Error Handling:
 *    - If upload fails, UploadSheet shows error state
 *    - uploadingFiles should be cleared on error
 *    - User can retry or close the sheet
 * 
 * 4. Progress Tracking:
 *    - UploadSheet shows progress indicator during upload
 *    - UploadingCard shows spinning loader in grid
 *    - Both provide visual feedback to user
 */
