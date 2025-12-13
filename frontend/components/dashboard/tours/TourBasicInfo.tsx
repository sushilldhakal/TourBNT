'use client';

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Paperclip, Trash2, Eye, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import MultipleSelector, { Option } from '@/components/ui/multiple-selector';
import NovelEditor from '@/components/dashboard/editor/NovelEditor';
import { GalleryPage } from '@/components/dashboard/gallery/GalleryPage';
import { useTourContext } from '@/providers/TourProvider';
import { getSellerCategories } from '@/lib/api/categories';
import { getSellerDestinations } from '@/lib/api/destinations';
import type { JSONContent } from 'novel';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { getUserById } from '@/lib/api';

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

/**
 * TourBasicInfo Component
 * Handles basic tour information including title, code, category, description, and media
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

export function TourBasicInfo() {
    const { register, setValue, watch, formState: { errors } } = useFormContext();
    const { editorContent, setEditorContent, isEditing, handleGenerateCode } = useTourContext();
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
    const [numPages, setNumPages] = useState<number>(1);
    const [pageNumber, setPageNumber] = useState<number>(1);

    // Watch form values
    const tourStatus = watch('tourStatus') || 'Draft';
    const enquiry = watch('enquiry');
    const selectedCategories = watch('category') || [];
    const coverImage = watch('coverImage');
    const destination = watch('destination');
    const file = watch('file');
    // PDF document load handler
    const onDocumentLoadSuccess = (pdf: any): void => {
        setNumPages(pdf.numPages);
        setPageNumber(1);
    };

    // PDF page navigation
    const changePage = (offset: number) => {
        setPageNumber(prevPageNumber => prevPageNumber + offset);
    };

    const nextPage = () => {
        changePage(1);
    };

    const prevPage = () => {
        changePage(-1);
    };

    // Fetch categories - use seller categories to get all (active and inactive)
    const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
        queryKey: ['categories', 'seller'],
        queryFn: getSellerCategories,
    });

    // Transform categories to options
    const categoryOptions: Option[] = React.useMemo(() => {
        console.log('categoriesData:', categoriesData);

        // Handle different response structures
        let categories = null;
        const data = categoriesData as any;

        if (Array.isArray(categoriesData)) {
            // Direct array response
            categories = categoriesData;
        } else if (data?.data) {
            // Nested in data property
            categories = data.data;
        }

        console.log('categories array:', categories);

        if (!categories || !Array.isArray(categories)) return [];

        const options = categories.map((cat: any) => ({
            label: cat.name,
            value: cat._id,
            disable: !cat.isActive, // Disable inactive categories
        }));
        console.log('categoryOptions:', options);
        return options;
    }, [categoriesData]);




    // Handle category change
    const handleCategoryChange = (options: Option[]) => {
        setValue('category', options, { shouldValidate: true });
    };

    // Handle image select from gallery
    const handleImageSelect = (imageUrl: string | string[]) => {
        const url = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
        setValue('coverImage', url);
        setImageDialogOpen(false);
    };

    // Handle PDF select from gallery
    const handlePdfSelect = (pdfUrl: string | string[]) => {
        const url = Array.isArray(pdfUrl) ? pdfUrl[0] : pdfUrl;
        setValue('file', url);
        setPdfDialogOpen(false);
    };

    // Handle remove image
    const handleRemoveImage = () => {
        setValue('coverImage', '');
    };

    // Handle remove PDF
    const handleRemovePdf = () => {
        setValue('file', '');
    };

    return (
        <Card className="shadow-xs pt-0">
            <CardHeader className="bg-secondary border-b p-6 rounded-xl">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl font-semibold">Tour Overview</CardTitle>
                </div>
                <CardDescription>
                    Add basic information about the tour
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
                {/* Title and Code */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="title">Tour Name</Label>
                        <Input
                            id="title"
                            placeholder="Tour name"
                            {...register('title')}
                        />
                        {errors.title && (
                            <p className="text-sm text-destructive">{errors.title.message as string}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="code">Trip Code</Label>
                        {isEditing ? (
                            <Input
                                id="code"
                                type="text"
                                className="w-full uppercase"
                                placeholder="Trip Code"
                                disabled
                                {...register('code')}
                            />
                        ) : (
                            <div className="flex space-x-2">
                                <Input
                                    id="code"
                                    type="text"
                                    className="w-full uppercase"
                                    placeholder="Trip Code"
                                    disabled
                                    {...register('code')}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGenerateCode}
                                >
                                    Generate
                                </Button>
                            </div>
                        )}
                        {errors.code && (
                            <p className="text-sm text-destructive">{errors.code.message as string}</p>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                    <Label>Category</Label>
                    {(() => {
                        console.log('Rendering categories - categoryOptions:', categoryOptions, 'length:', categoryOptions?.length, 'loading:', categoriesLoading);
                        return null;
                    })()}
                    {categoriesLoading ? (
                        <p className="text-sm text-muted-foreground">Loading categories...</p>
                    ) : categoryOptions && categoryOptions.length > 0 ? (
                        <MultipleSelector
                            value={selectedCategories}
                            onChange={handleCategoryChange}
                            options={categoryOptions}
                            placeholder="Select categories..."
                            emptyIndicator={
                                <p className="text-center text-sm text-muted-foreground">
                                    No categories found
                                </p>
                            }
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">No categories available</p>
                    )}
                    {errors.category && (
                        <p className="text-sm text-destructive">{errors.category.message as string}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-1">
                    {/* Tour Status */}
                    <div className="space-y-2">
                        <Label>Tour Status</Label>
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    {tourStatus}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] z-50" align="start">
                                <DropdownMenuItem onClick={() => setValue('tourStatus', 'Published')}>
                                    Published
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setValue('tourStatus', 'Draft')}>
                                    Draft
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setValue('tourStatus', 'Expired')}>
                                    Expired
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                </div>


                {/* Excerpt */}
                <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                        id="excerpt"
                        className="min-h-32"
                        placeholder="Tour Excerpt"
                        {...register('excerpt')}
                    />
                    {errors.excerpt && (
                        <p className="text-sm text-destructive">{errors.excerpt.message as string}</p>
                    )}
                </div>



                {/* Description */}
                <div className="space-y-2">
                    <Label>Description</Label>
                    <NovelEditor
                        initialValue={editorContent}
                        onContentChange={(content: JSONContent) => {
                            setEditorContent(content);
                            setValue('description', JSON.stringify(content));
                        }}
                        placeholder="Describe the tour details..."
                        minHeight="300px"
                        enableAI={false}
                        enableGallery={true}
                    />
                </div>

                {/* Cover Image and PDF */}
                <div className="grid grid-flow-col grid-cols-2 gap-3">
                    {/* Cover Image */}
                    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-xs overflow-hidden">
                        <div className="flex flex-col min-h-20 space-y-1.5 p-6 relative">
                            <Label>Cover Image</Label>
                            {coverImage && coverImage.trim() !== '' ? (
                                <div className="mt-2 relative">
                                    <div className="relative aspect-4/3 rounded-md overflow-hidden border border-border bg-primary/5">
                                        <img
                                            src={coverImage}
                                            alt="Selected cover"
                                            className="object-cover w-full h-full"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive"
                                        aria-label="Remove image"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="mt-2">
                                            <Paperclip className="h-4 w-4 mr-2" />
                                            Choose Image
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
                                        <DialogHeader className="px-6 pt-6 pb-4 border-b">
                                            <DialogTitle className="text-left">
                                                Choose Image From Gallery
                                            </DialogTitle>
                                            <DialogDescription>
                                                Select an image for your tour cover
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="overflow-auto h-[calc(95vh-120px)]">
                                            <GalleryPage
                                                mode="picker"
                                                onMediaSelect={handleImageSelect}
                                                allowMultiple={false}
                                                mediaType="images"
                                                initialTab="images"
                                            />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>

                    {/* PDF */}
                    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-xs overflow-hidden">
                        <div className="flex flex-col min-h-20 space-y-1.5 p-6 relative">
                            <Label>PDF</Label>
                            {file && file.trim() !== '' ? (
                                <div className="mt-2 relative group">
                                    <div className="relative aspect-4/3 rounded-md overflow-hidden border border-border bg-muted">
                                        <PDFDocument file={file} onLoadSuccess={onDocumentLoadSuccess}>
                                            <PDFPage
                                                pageNumber={pageNumber}
                                                width={300}
                                                className="w-full h-full"
                                            />
                                        </PDFDocument>

                                        {/* PDF Navigation Controls */}
                                        <div className="absolute flex justify-center items-center gap-2 bottom-2 left-1/2 transform -translate-x-1/2 z-10 p-2 bg-white/90 dark:bg-gray-800/90 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                type="button"
                                                className="p-0 rounded-md px-2 text-xs h-7"
                                                variant="ghost"
                                                size="sm"
                                                onClick={prevPage}
                                                disabled={pageNumber <= 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="px-2 text-xs flex items-center whitespace-nowrap">
                                                {pageNumber} / {numPages}
                                            </span>
                                            <Button
                                                type="button"
                                                className="p-0 rounded-md px-2 text-xs h-7"
                                                variant="ghost"
                                                size="sm"
                                                onClick={nextPage}
                                                disabled={pageNumber >= numPages}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* View Full PDF Link */}
                                        <div className="absolute top-2 left-2 z-10">
                                            <a
                                                href={file}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 px-2 py-1 text-xs bg-white/90 dark:bg-gray-800/90 rounded-md hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <Eye className="h-3 w-3" />
                                                View Full
                                            </a>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemovePdf}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive z-10"
                                        aria-label="Remove PDF"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="mt-2">
                                            <Paperclip className="h-4 w-4 mr-2" />
                                            Choose PDF
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
                                        <DialogHeader className="px-6 pt-6 pb-4 border-b">
                                            <DialogTitle className="text-left">
                                                Choose PDF From Gallery
                                            </DialogTitle>
                                            <DialogDescription>
                                                Select a PDF file for your tour
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="overflow-auto h-[calc(95vh-120px)]">
                                            <GalleryPage
                                                mode="picker"
                                                onMediaSelect={handlePdfSelect}
                                                allowMultiple={false}
                                                mediaType="pdfs"
                                                initialTab="pdfs"
                                            />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tour Settings */}
                <div className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Tour Settings</h3>
                        <p className="text-sm text-muted-foreground">Configure additional settings for the tour</p>
                    </div>

                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Enable Enquiries</Label>
                            <p className="text-sm text-muted-foreground">
                                Allow users to send inquiries about this tour
                            </p>
                        </div>
                        <Switch
                            checked={Boolean(enquiry)}
                            onCheckedChange={(v) => setValue('enquiry', v)}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
