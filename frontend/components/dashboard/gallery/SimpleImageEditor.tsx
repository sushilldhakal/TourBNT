'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/Icon';

interface SimpleImageEditorProps {
    source: string;
    onSave: (editedImageObject: any) => void;
    onClose: () => void;
}

interface ImageFilters {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
}

export default function SimpleImageEditor({ source, onSave, onClose }: SimpleImageEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<ImageFilters>({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        rotation: 0,
        flipX: false,
        flipY: false,
    });

    // Load image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setImage(img);
            setIsLoading(false);
        };
        img.onerror = () => {
            console.error('Failed to load image');
            setIsLoading(false);
        };
        img.src = source;
    }, [source]);

    // Apply filters to canvas
    const applyFilters = useCallback(() => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = image.width;
        canvas.height = image.height;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Apply transformations
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // Apply rotation
        if (filters.rotation !== 0) {
            ctx.rotate((filters.rotation * Math.PI) / 180);
        }

        // Apply flip
        ctx.scale(filters.flipX ? -1 : 1, filters.flipY ? -1 : 1);

        // Apply filters
        const filterString = [
            `brightness(${filters.brightness}%)`,
            `contrast(${filters.contrast}%)`,
            `saturate(${filters.saturation}%)`,
            filters.blur > 0 ? `blur(${filters.blur}px)` : '',
        ].filter(Boolean).join(' ');

        ctx.filter = filterString;

        // Draw image
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        // Restore context state
        ctx.restore();
    }, [image, filters]);

    // Apply filters when they change
    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const handleFilterChange = (filterName: keyof ImageFilters, value: number | boolean) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    const resetFilters = () => {
        setFilters({
            brightness: 100,
            contrast: 100,
            saturation: 100,
            blur: 0,
            rotation: 0,
            flipX: false,
            flipY: false,
        });
    };

    const handleSave = () => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);

        onSave({
            imageBase64,
            quality: 0.9,
            mimeType: 'image/jpeg'
        });
    };

    const rotate90 = () => {
        setFilters(prev => ({
            ...prev,
            rotation: (prev.rotation + 90) % 360
        }));
    };

    const flipHorizontal = () => {
        setFilters(prev => ({
            ...prev,
            flipX: !prev.flipX
        }));
    };

    const flipVertical = () => {
        setFilters(prev => ({
            ...prev,
            flipY: !prev.flipY
        }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading image editor...</p>
                </div>
            </div>
        );
    }

    if (!image) {
        return (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center text-red-500">
                    <p>Failed to load image</p>
                    <Button onClick={onClose} className="mt-4">
                        Close
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[600px] w-full bg-background">
            {/* Canvas Area */}
            <div className="flex-1 flex items-center justify-center bg-muted/20 p-4">
                <div className="relative max-w-full max-h-full overflow-auto">
                    <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-full border border-border rounded shadow-lg"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '500px',
                            objectFit: 'contain'
                        }}
                    />
                </div>
            </div>

            {/* Controls Panel */}
            <div className="w-80 border-l bg-background p-4 overflow-y-auto">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Edit Image</h3>
                        <Button variant="ghost" size="icon-sm" onClick={onClose}>
                            <Icon name="lu:LuX" size={20} />
                        </Button>
                    </div>

                    {/* Transform Controls */}
                    <div className="space-y-4">
                        <h4 className="font-medium">Transform</h4>

                        <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" size="sm" onClick={rotate90}>
                                <Icon name="lu:LuRotateCw" size={16} className="mr-1" />
                                Rotate
                            </Button>
                            <Button variant="outline" size="sm" onClick={flipHorizontal}>
                                <Icon name="lu:LuFlipHorizontal" size={16} className="mr-1" />
                                Flip H
                            </Button>
                            <Button variant="outline" size="sm" onClick={flipVertical}>
                                <Icon name="lu:LuFlipVertical" size={16} className="mr-1" />
                                Flip V
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Filter Controls */}
                    <div className="space-y-4">
                        <h4 className="font-medium">Adjustments</h4>

                        {/* Brightness */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm">Brightness</label>
                                <span className="text-sm text-muted-foreground">{filters.brightness}%</span>
                            </div>
                            <input
                                type="range"
                                value={filters.brightness}
                                onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
                                min={0}
                                max={200}
                                step={1}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Contrast */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm">Contrast</label>
                                <span className="text-sm text-muted-foreground">{filters.contrast}%</span>
                            </div>
                            <input
                                type="range"
                                value={filters.contrast}
                                onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
                                min={0}
                                max={200}
                                step={1}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Saturation */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm">Saturation</label>
                                <span className="text-sm text-muted-foreground">{filters.saturation}%</span>
                            </div>
                            <input
                                type="range"
                                value={filters.saturation}
                                onChange={(e) => handleFilterChange('saturation', parseInt(e.target.value))}
                                min={0}
                                max={200}
                                step={1}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Blur */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm">Blur</label>
                                <span className="text-sm text-muted-foreground">{filters.blur}px</span>
                            </div>
                            <input
                                type="range"
                                value={filters.blur}
                                onChange={(e) => handleFilterChange('blur', parseFloat(e.target.value))}
                                min={0}
                                max={10}
                                step={0.1}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <Button onClick={resetFilters} variant="outline" className="w-full">
                            <Icon name="lu:LuRotateCcw" size={16} className="mr-2" />
                            Reset All
                        </Button>
                        <Button onClick={handleSave} className="w-full">
                            <Icon name="lu:LuCheck" size={16} className="mr-2" />
                            Save Changes
                        </Button>
                    </div>

                    {/* Info */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Simple HTML5 Canvas-based editor</p>
                        <p>• Compatible with React 18 and Next.js</p>
                        <p>• Basic adjustments and transformations</p>
                    </div>
                </div>
            </div>
        </div>
    );
}