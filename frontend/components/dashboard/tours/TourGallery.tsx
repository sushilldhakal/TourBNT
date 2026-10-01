'use client';

import React, { useState } from 'react';
import {
    X,
    ImageIcon,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    AlertTriangle,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTourContext } from '@/providers/TourProvider';
import type { GalleryItem } from '@/lib/schemas/tourEditor';
import { Gallery } from '@/components/dashboard/gallery/Gallery';
import Image from 'next/image';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

/**
 * TourGallery Component
 * Handles tour gallery with image upload, grid display, and drag-and-drop reordering
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

export function TourGallery() {

    const { galleryFields, appendGallery, galleryRemove, galleryMove, form } = useTourContext();
    const { watch } = form;


    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

    // Watch gallery from form
    const gallery = (watch('gallery') ?? []) as GalleryItem[];

    // Open gallery picker dialog
    const handleOpenGalleryPicker = () => {
        setGalleryPickerOpen(true);
    };

    const handleMediaSelect = (urls: string | string[]) => {
        const urlArray = Array.isArray(urls) ? urls : [urls];

        // Add each URL to gallery using appendGallery
        urlArray.forEach((url) => {
            appendGallery({
                image: url,
            });
        });

        // Close picker
        setGalleryPickerOpen(false);
    };

    // Handle remove image
    const handleRemoveImage = (index: number) => {
        setDeleteIndex(index);
    };
    const handleDeleteConfirm = () => {
        if (deleteIndex !== null) {
            galleryRemove(deleteIndex);
            setDeleteIndex(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteIndex(null);
    };

    // Handle drag and drop
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        galleryMove(draggedIndex, dropIndex);
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // Handle image viewer
    const handleImageClick = (index: number) => {
        setSelectedIndex(index);
        setViewerOpen(true);
    };

    const goNext = () => {
        setSelectedIndex((prev) => (prev + 1) % gallery.length);
    };

    const goPrev = () => {
        setSelectedIndex((prev) =>
            prev === 0 ? gallery.length - 1 : prev - 1
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" aria-hidden="true" />
                        Tour Gallery
                    </CardTitle>
                    <CardDescription>
                        Add beautiful images to showcase your tour. Drag and drop to reorder.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Gallery Picker Button */}
                    <div className="flex items-center justify-between">
                        <Label>Gallery Images</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpenGalleryPicker}
                        >
                            <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                            Select from Gallery
                        </Button>
                    </div>

                    {/* Image Grid */}
                    {gallery.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {galleryFields.map((field, index) => {
                                const item = gallery[index];
                                return (
                                    <GalleryImageItem
                                        key={field.id}
                                        item={item}
                                        index={index}
                                        onRemove={() => handleRemoveImage(index)}
                                        onClick={() => handleImageClick(index)}
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        isDragging={draggedIndex === index}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 rounded-lg border-2 border-dashed border-border text-center bg-secondary/20">
                            <div className="bg-primary/10 p-4 rounded-full mb-4">
                                <ImageIcon className="h-8 w-8 text-primary" aria-hidden="true" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">No images added yet</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-md">
                                Add beautiful images to showcase your tour and attract potential customers
                            </p>
                            <Button
                                type="button"
                                onClick={handleOpenGalleryPicker}
                            >
                                <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                                Select from Gallery
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Image Viewer Dialog */}
            <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
                <DialogContent className="max-w-6xl p-4">
                    <DialogTitle className="sr-only">Image Gallery Viewer</DialogTitle>
                    <DialogDescription className="sr-only">
                        Full screen image viewer with navigation controls
                    </DialogDescription>
                    <div className="relative w-full h-[70vh] flex items-center justify-center bg-muted rounded-md">
                        {gallery[selectedIndex] ? (
                            <Image
                                src={gallery[selectedIndex].image}
                                alt={`Gallery ${selectedIndex + 1}`}
                                fill
                                sizes="(max-width: 768px) 100vw, 80vw"
                                className="h-auto w-auto max-h-full max-w-full object-contain"
                            />
                        ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        )}

                        {/* Navigation Buttons */}
                        {gallery.length > 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                                    onClick={goPrev}
                                    aria-label="Previous image"
                                >
                                    <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                                    onClick={goNext}
                                    aria-label="Next image"
                                >
                                    <ChevronRight className="h-6 w-6" aria-hidden="true" />
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Dots Navigation */}
                    {gallery.length > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            {gallery.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedIndex(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${selectedIndex === i
                                        ? 'bg-primary w-6'
                                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                                        }`}
                                    aria-label={`Go to image ${i + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteIndex !== null} onOpenChange={(open) => !open && handleDeleteCancel()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
                            Delete Image?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this image from the gallery?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleDeleteCancel}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Gallery Picker Dialog */}
            <Dialog open={galleryPickerOpen} onOpenChange={setGalleryPickerOpen}>
                <DialogContent className="!w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] left-1/2 -translate-x-1/2 max-h-[90vh] p-0">
                    <VisuallyHidden>

                        <DialogHeader className="p-6 pb-0">
                            <DialogTitle>Select Images from Gallery</DialogTitle>
                            <DialogDescription>
                                Choose images from your media gallery to add to the tour. You can also upload new images.
                            </DialogDescription>
                        </DialogHeader>
                    </VisuallyHidden>
                    {/* Use the existing Gallery component in picker mode */}
                    <div className="h-[calc(90vh-120px)] w-full overflow-y-auto">
                        <Gallery
                            mode="picker"
                            onMediaSelect={handleMediaSelect}
                            allowMultiple={true}
                            initialTab="images"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/**
 * Gallery Image Item Component
 * Individual gallery image with drag-and-drop support
 */
interface GalleryImageItemProps {
    item: GalleryItem;
    index: number;
    onRemove: () => void;
    onClick: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    isDragging: boolean;
}

function GalleryImageItem({
    item,
    index,
    onRemove,
    onClick,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging,
}: GalleryImageItemProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={`relative group overflow-hidden rounded-lg border transition-all cursor-move ${isDragging
                ? 'opacity-50 scale-95'
                : 'hover:shadow-md hover:border-primary/50'
                }`}
        >
            {/* Drag Handle */}
            <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-background/80 p-1 rounded">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>

            {/* Image */}
            <div
                className="aspect-video w-full cursor-pointer"
                onClick={onClick}
            >
                {imageError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/50 text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mb-2" />
                        <p className="text-xs">Failed to load</p>
                    </div>
                ) : (
                    <Image
                        src={item.image}
                        alt={item.alt || `Gallery ${index + 1}`}
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                )}
            </div>

            {/* Remove Button */}
            <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                aria-label="Remove image"
            >
                <X className="h-4 w-4" />
            </Button>

            {/* Image Number Badge */}
            <div className="absolute bottom-2 left-2 bg-background/80 text-xs px-2 py-1 rounded">
                {index + 1}
            </div>
        </div>
    );
}
