'use client';

import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import {
    X,
    Plus,
    ImageIcon,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    AlertTriangle,
    Upload,
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
import { getDefaultGalleryItem } from '@/lib/utils/defaultTourValues';
import type { GalleryItem } from '@/lib/schemas/tourEditor';

/**
 * TourGallery Component
 * Handles tour gallery with image upload, grid display, and drag-and-drop reordering
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

export function TourGallery() {
    const { setValue, watch } = useFormContext();
    const [imageArray, setImageArray] = useState<GalleryItem[]>([]);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Watch gallery from form
    const gallery = watch('gallery') || [];

    // Sync gallery from form to local state
    useEffect(() => {
        if (Array.isArray(gallery) && gallery.length > 0) {
            setImageArray(gallery);
        }
    }, [gallery]);

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Create preview URLs for uploaded files
        const newItems: GalleryItem[] = [];
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newItem: GalleryItem = {
                    image: reader.result as string,
                    tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                };
                newItems.push(newItem);

                // Update state when all files are read
                if (newItems.length === files.length) {
                    setImageArray((prev) => {
                        const updated = [...prev, ...newItems];
                        setValue('gallery', updated, { shouldDirty: true });
                        return updated;
                    });
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        e.target.value = '';
    };

    // Handle remove image
    const handleRemoveImage = (index: number) => {
        setDeleteIndex(index);
    };

    const handleDeleteConfirm = () => {
        if (deleteIndex !== null) {
            setImageArray((prev) => {
                const filtered = prev.filter((_, i) => i !== deleteIndex);
                setValue('gallery', filtered, { shouldDirty: true });
                return filtered;
            });
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

        setImageArray((prev) => {
            const newArray = [...prev];
            const [draggedItem] = newArray.splice(draggedIndex, 1);
            newArray.splice(dropIndex, 0, draggedItem);
            setValue('gallery', newArray, { shouldDirty: true });
            return newArray;
        });

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
        setSelectedIndex((prev) => (prev + 1) % imageArray.length);
    };

    const goPrev = () => {
        setSelectedIndex((prev) =>
            prev === 0 ? imageArray.length - 1 : prev - 1
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Tour Gallery
                    </CardTitle>
                    <CardDescription>
                        Add beautiful images to showcase your tour. Drag and drop to reorder.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Upload Button */}
                    <div className="flex items-center justify-between">
                        <Label>Gallery Images</Label>
                        <div>
                            <input
                                type="file"
                                id="gallery-upload"
                                accept="image/*"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('gallery-upload')?.click()}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Images
                            </Button>
                        </div>
                    </div>

                    {/* Image Grid */}
                    {imageArray.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {imageArray.map((item, index) => (
                                <GalleryImageItem
                                    key={item.tempId || item._id || index}
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
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 rounded-lg border-2 border-dashed border-border text-center bg-secondary/20">
                            <div className="bg-primary/10 p-4 rounded-full mb-4">
                                <ImageIcon className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="font-medium text-lg mb-2">No images added yet</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">
                                Add beautiful images to showcase your tour and attract potential customers
                            </p>
                            <Button
                                type="button"
                                onClick={() => document.getElementById('gallery-upload')?.click()}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Images
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Image Viewer Dialog */}
            <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
                <DialogContent className="max-w-4xl p-4">
                    <DialogTitle className="sr-only">Image Gallery Viewer</DialogTitle>
                    <DialogDescription className="sr-only">
                        Full screen image viewer with navigation controls
                    </DialogDescription>
                    <div className="relative w-full h-[70vh] flex items-center justify-center bg-muted rounded-md">
                        {imageArray[selectedIndex] ? (
                            <img
                                src={imageArray[selectedIndex].image}
                                alt={`Gallery ${selectedIndex + 1}`}
                                className="max-h-full max-w-full object-contain"
                            />
                        ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        )}

                        {/* Navigation Buttons */}
                        {imageArray.length > 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                                    onClick={goPrev}
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                                    onClick={goNext}
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Dots Navigation */}
                    {imageArray.length > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            {imageArray.map((_, i) => (
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
                            <AlertTriangle className="h-5 w-5 text-destructive" />
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
                    <img
                        src={item.image}
                        alt={`Gallery ${index + 1}`}
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
