/**
 * GalleryExample Component
 * 
 * Example demonstrating both standalone and picker modes of the Gallery.
 * This is for documentation and testing purposes.
 */

'use client';

import React, { useState } from 'react';
import { GalleryPage } from './GalleryPage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/Icon';

/**
 * Example 1: Standalone Mode
 * Full-featured gallery as a standalone page
 */
export function StandaloneGalleryExample() {
    return (
        <div className="min-h-screen">
            <GalleryPage
                mode="standalone"
                initialTab="images"
            />
        </div>
    );
}

/**
 * Example 2: Picker Mode - Single Selection
 * Gallery used as a media picker for selecting a single file
 */
export function SinglePickerExample() {
    const [selectedUrl, setSelectedUrl] = useState<string>('');
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const handleMediaSelect = (url: string | string[]) => {
        setSelectedUrl(url as string);
        setIsPickerOpen(false);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Single Media Picker Example</CardTitle>
                <CardDescription>
                    Click the button to open the gallery and select a single media item
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={() => setIsPickerOpen(true)}>
                    <Icon name="lu:LuImage" size={16} className="mr-2" />
                    Select Media
                </Button>

                {selectedUrl && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Selected Media:</p>
                        <div className="relative w-full h-64 rounded-lg overflow-hidden border">
                            <img
                                src={selectedUrl}
                                alt="Selected media"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground break-all">
                            {selectedUrl}
                        </p>
                    </div>
                )}

                <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                    <DialogContent className="max-w-6xl h-[80vh] p-0">
                        <GalleryPage
                            mode="picker"
                            allowMultiple={false}
                            onMediaSelect={handleMediaSelect}
                            initialTab="images"
                        />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

/**
 * Example 3: Picker Mode - Multiple Selection
 * Gallery used as a media picker for selecting multiple files
 */
export function MultiplePickerExample() {
    const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const handleMediaSelect = (urls: string | string[]) => {
        setSelectedUrls(Array.isArray(urls) ? urls : [urls]);
        setIsPickerOpen(false);
    };

    const removeUrl = (index: number) => {
        setSelectedUrls((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Multiple Media Picker Example</CardTitle>
                <CardDescription>
                    Click the button to open the gallery and select multiple media items
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={() => setIsPickerOpen(true)}>
                    <Icon name="lu:LuImages" size={16} className="mr-2" />
                    Select Multiple Media
                </Button>

                {selectedUrls.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">
                            Selected Media ({selectedUrls.length}):
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                            {selectedUrls.map((url, index) => (
                                <div
                                    key={index}
                                    className="relative group aspect-square rounded-lg overflow-hidden border"
                                >
                                    <img
                                        src={url}
                                        alt={`Selected media ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={() => removeUrl(index)}
                                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove media"
                                    >
                                        <Icon name="lu:LuX" size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                    <DialogContent className="max-w-6xl h-[80vh] p-0">
                        <GalleryPage
                            mode="picker"
                            allowMultiple={true}
                            onMediaSelect={handleMediaSelect}
                            initialTab="images"
                        />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

/**
 * Example 4: Form Integration
 * Gallery picker integrated into a form
 */
export function FormIntegrationExample() {
    const [formData, setFormData] = useState({
        title: '',
        coverImage: '',
        galleryImages: [] as string[],
    });
    const [pickerMode, setPickerMode] = useState<'cover' | 'gallery' | null>(null);

    const handleCoverImageSelect = (url: string | string[]) => {
        setFormData((prev) => ({ ...prev, coverImage: url as string }));
        setPickerMode(null);
    };

    const handleGalleryImagesSelect = (urls: string | string[]) => {
        setFormData((prev) => ({
            ...prev,
            galleryImages: Array.isArray(urls) ? urls : [urls],
        }));
        setPickerMode(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        alert('Form submitted! Check console for data.');
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Form Integration Example</CardTitle>
                <CardDescription>
                    Example of using the gallery picker in a form
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, title: e.target.value }))
                            }
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="Enter title"
                        />
                    </div>

                    {/* Cover Image Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Cover Image</label>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPickerMode('cover')}
                        >
                            <Icon name="lu:LuImage" size={16} className="mr-2" />
                            {formData.coverImage ? 'Change Cover Image' : 'Select Cover Image'}
                        </Button>
                        {formData.coverImage && (
                            <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                <img
                                    src={formData.coverImage}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </div>

                    {/* Gallery Images Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Gallery Images ({formData.galleryImages.length})
                        </label>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPickerMode('gallery')}
                        >
                            <Icon name="lu:LuImages" size={16} className="mr-2" />
                            {formData.galleryImages.length > 0
                                ? 'Change Gallery Images'
                                : 'Select Gallery Images'}
                        </Button>
                        {formData.galleryImages.length > 0 && (
                            <div className="grid grid-cols-4 gap-2">
                                {formData.galleryImages.map((url, index) => (
                                    <div
                                        key={index}
                                        className="aspect-square rounded-lg overflow-hidden border"
                                    >
                                        <img
                                            src={url}
                                            alt={`Gallery ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button type="submit" className="w-full">
                        Submit Form
                    </Button>
                </form>

                {/* Cover Image Picker */}
                <Dialog open={pickerMode === 'cover'} onOpenChange={() => setPickerMode(null)}>
                    <DialogContent className="max-w-6xl h-[80vh] p-0">
                        <GalleryPage
                            mode="picker"
                            allowMultiple={false}
                            onMediaSelect={handleCoverImageSelect}
                            initialTab="images"
                        />
                    </DialogContent>
                </Dialog>

                {/* Gallery Images Picker */}
                <Dialog open={pickerMode === 'gallery'} onOpenChange={() => setPickerMode(null)}>
                    <DialogContent className="max-w-6xl h-[80vh] p-0">
                        <GalleryPage
                            mode="picker"
                            allowMultiple={true}
                            onMediaSelect={handleGalleryImagesSelect}
                            initialTab="images"
                        />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

/**
 * Combined Examples Page
 * Shows all examples in one place
 */
export function GalleryExamplesPage() {
    const [activeExample, setActiveExample] = useState<
        'standalone' | 'single' | 'multiple' | 'form'
    >('single');

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Gallery Examples</h1>
                    <p className="text-muted-foreground">
                        Interactive examples demonstrating different gallery modes
                    </p>
                </div>

                {/* Example Selector */}
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant={activeExample === 'single' ? 'default' : 'outline'}
                        onClick={() => setActiveExample('single')}
                    >
                        Single Picker
                    </Button>
                    <Button
                        variant={activeExample === 'multiple' ? 'default' : 'outline'}
                        onClick={() => setActiveExample('multiple')}
                    >
                        Multiple Picker
                    </Button>
                    <Button
                        variant={activeExample === 'form' ? 'default' : 'outline'}
                        onClick={() => setActiveExample('form')}
                    >
                        Form Integration
                    </Button>
                    <Button
                        variant={activeExample === 'standalone' ? 'default' : 'outline'}
                        onClick={() => setActiveExample('standalone')}
                    >
                        Standalone Gallery
                    </Button>
                </div>

                {/* Active Example */}
                <div>
                    {activeExample === 'single' && <SinglePickerExample />}
                    {activeExample === 'multiple' && <MultiplePickerExample />}
                    {activeExample === 'form' && <FormIntegrationExample />}
                    {activeExample === 'standalone' && <StandaloneGalleryExample />}
                </div>
            </div>
        </div>
    );
}
