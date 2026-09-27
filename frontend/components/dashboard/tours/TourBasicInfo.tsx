'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUserCategories } from '@/lib/queries';
import { useDestinationsRoleBased } from '@/lib/queries/useDestinations';
import { DestinationTypes } from '@/types/types';
import { Paperclip, Trash2, Eye, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Controller } from 'react-hook-form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/MultiSelect';

import { Gallery } from '@/components/dashboard/gallery/Gallery';
import { useTourContext } from '@/providers/TourProvider';
import Image from 'next/image';
import type { JSONContent } from 'novel';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

// Dynamically import NovelEditor at module level to keep a stable component identity
const NovelEditor = dynamic(() => import('@/components/dashboard/editor/NovelEditor'), {
    ssr: false,
    loading: () => <p>Loading Editor...</p>, // Optional loading state
});



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

// Type for PDF document proxy from react-pdf
// Using a simple type that matches the onLoadSuccess callback parameter
type PDFDocumentProxy = {
    numPages: number;
};

/**
 * TourBasicInfo Component
 * Handles basic tour information including title, code, category, description, and media
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

export function TourBasicInfo() {
    const { form, editorContent, isEditing, handleGenerateCode } = useTourContext();
    const { register, setValue, watch, control, formState: { errors } } = form;

    // Get current form value to use as fallback if memoized content is null
    const currentDescription = watch('description');
    // Cache initial description value so the editor is not re-initialized on every render
    const initialDescriptionRef = useRef<JSONContent | null>(null);

    if (initialDescriptionRef.current === null) {
        if (editorContent && typeof editorContent === 'object' && 'type' in editorContent) {
            initialDescriptionRef.current = editorContent as JSONContent;
        } else if (currentDescription && typeof currentDescription === 'object' && 'type' in currentDescription) {
            initialDescriptionRef.current = currentDescription as JSONContent;
        }
    }

    const descriptionInitialValue = initialDescriptionRef.current;


    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
    const [numPages, setNumPages] = useState<number>(1);
    const [pageNumber, setPageNumber] = useState<number>(1);

    const selectedCategories = watch('category') || [];
    const tourStatusValue = watch('tourStatus');
    // MultiSelect expects string[]; form stores category as { label, value, disable }[]
    const categoryValueForSelect: string[] = Array.isArray(selectedCategories)
        ? selectedCategories.map((c: { value?: string } | string) =>
            typeof c === 'string' ? c : (c?.value ?? '')
        ).filter(Boolean)
        : [];
    const coverImage = watch('coverImage');
    const file = watch('file');

    // // Debug: log tourStatus and category so we can see the data
    // useEffect(() => {
    //     console.log('[TourBasicInfo] tourStatus:', tourStatusValue);
    //     console.log('[TourBasicInfo] category (raw):', selectedCategories);
    //     console.log('[TourBasicInfo] category (IDs for MultiSelect):', categoryValueForSelect);
    // }, [tourStatusValue, selectedCategories, categoryValueForSelect]);

    // PDF document load handler
    const onDocumentLoadSuccess = (pdf: PDFDocumentProxy): void => {
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

    const { data: categoriesData, isLoading: categoriesLoading } = useUserCategories();
    const { data: destinations = [], isLoading: destinationsLoading } = useDestinationsRoleBased();

    type CategoryOption = { label: string; value: string; disable: boolean };

    // Transform categories to options
    const categoryOptions: CategoryOption[] = React.useMemo(() => {
        type AnyRecord = Record<string, unknown>;
        type CategoryResponse =
            | AnyRecord[]
            | { categories: AnyRecord[]; count?: number }
            | { data: AnyRecord[] };

        const data = categoriesData as CategoryResponse | undefined;
        const rawList: AnyRecord[] = (() => {
            if (!data) return [];
            if (Array.isArray(data)) return data;
            if (typeof data !== 'object') return [];

            const rec = data as Record<string, unknown>;
            const fromCategories = rec.categories;
            if (Array.isArray(fromCategories)) return fromCategories as AnyRecord[];

            const fromData = rec.data;
            if (Array.isArray(fromData)) return fromData as AnyRecord[];

            return [];
        })();

        // Seller endpoint `/global/categories/my-categories` returns relationship objects:
        // { isActive, customName?, category/globalCategory: { _id, name, isActive, ... } }
        return rawList
            .map((item): CategoryOption | null => {
                const itemRec = item as AnyRecord;
                const catRec = (itemRec['category'] ?? itemRec['globalCategory'] ?? itemRec) as AnyRecord;

                const id = String(
                    (catRec['_id'] ??
                        catRec['id'] ??
                        itemRec['_id'] ??
                        itemRec['id'] ??
                        '') as string
                );
                const label = String(
                    (itemRec['customName'] ??
                        catRec['customName'] ??
                        catRec['name'] ??
                        itemRec['name'] ??
                        '') as string
                ).trim();
                if (!id || !label) return null;

                const isActive =
                    typeof itemRec['isActive'] === 'boolean'
                        ? (itemRec['isActive'] as boolean)
                        : typeof catRec['isActive'] === 'boolean'
                            ? (catRec['isActive'] as boolean)
                            : true;

                return { label, value: id, disable: !isActive };
            })
            .filter((o): o is CategoryOption => o != null);
    }, [categoriesData]);

    // Merge options with form-selected categories so IDs from tour data exist in the list
    // (useUserCategories may not include every category the tour has, or options load after form reset)
    const categoryOptionsForSelect = React.useMemo(() => {
        const byValue = new Map(categoryOptions.map((o) => [o.value, o]));
        for (const id of categoryValueForSelect) {
            if (id && !byValue.has(id)) {
                const raw = selectedCategories.find(
                    (c: { value?: string } | string) => (typeof c === 'string' ? c : c?.value) === id
                );
                const label = typeof raw === 'object' && raw && 'label' in raw ? String((raw as { label?: string }).label || id) : id;
                byValue.set(id, { label, value: id, disable: false });
            }
        }
        return Array.from(byValue.values());
    }, [categoryOptions, categoryValueForSelect, selectedCategories]);

    // Handle category change: MultiSelect passes string[] (IDs); schema expects { label, value, disable }[]
    const handleCategoryChange = (selectedIds: string[]) => {
        const categoryObjects = selectedIds.map((id) => {
            const opt = categoryOptionsForSelect.find((o) => o.value === id);
            return opt
                ? { label: opt.label, value: opt.value, disable: opt.disable }
                : { label: id, value: id, disable: false };
        });
        setValue('category', categoryObjects, { shouldValidate: true });
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
                    {categoriesLoading ? (
                        <p className="text-sm text-muted-foreground">Loading categories...</p>
                    ) : categoryOptionsForSelect.length > 0 ? (
                        <MultiSelect
                            defaultValue={categoryValueForSelect}
                            onValueChange={handleCategoryChange}
                            options={categoryOptionsForSelect.map((o) => ({ label: o.label, value: o.value, disabled: o.disable }))}
                            placeholder="Select categories..."
                            resetOnDefaultValueChange={true}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">No categories available</p>
                    )}
                    {errors.category && (
                        <p className="text-sm text-destructive">{errors.category.message as string}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {/* Tour Status */}
                    <div className="space-y-2">
                        <Label htmlFor="tour-status">Tour Status</Label>
                        <Controller
                            name="tourStatus"
                            control={control}
                            render={({ field }) => {
                                const statusOptions = ['Draft', 'Published', 'Archived'] as const;
                                const raw = field.value ? String(field.value).trim() : '';
                                const validStatus = statusOptions.find((s) => s.toLowerCase() === raw.toLowerCase()) ?? 'Draft';
                                return (
                                <Select
                                    key={`tour-status-${validStatus}`}
                                    value={validStatus}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger className="w-full" id="tour-status">
                                        <SelectValue placeholder="Select tour status" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem value="Draft">Draft</SelectItem>
                                        <SelectItem value="Published">Published</SelectItem>
                                        <SelectItem value="Archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                                );
                            }}
                        />
                    </div>

                    {/* Destination */}
                    <div className="space-y-2">
                        <Label htmlFor="destination">Destination</Label>
                        <Controller
                            name="destination"
                            control={control}
                            render={({ field }) => {
                                const valueStr = field.value != null && field.value !== '' ? String(field.value) : undefined;
                                // Re-mount Select when destinations load so value matches an option and displays correctly
                                const destKey = `destination-${(destinations?.length ?? 0)}-${valueStr ?? 'empty'}`;
                                return (
                                    <Select
                                        key={destKey}
                                        onValueChange={(v) => field.onChange(v || '')}
                                        value={valueStr}
                                    >
                                        <SelectTrigger className="w-full" id="destination">
                                            <SelectValue placeholder="Select a destination" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            {destinationsLoading ? (
                                                <div className="px-2 py-3 text-center text-sm text-muted-foreground">Loading destinations...</div>
                                            ) : Array.isArray(destinations) && destinations.length > 0 ? (
                                                (destinations as DestinationTypes[]).map((dest) => {
                                                    const id = dest._id != null ? String(dest._id) : '';
                                                    if (!id) return null;
                                                    return (
                                                        <SelectItem
                                                            disabled={dest.isActive === false}
                                                            key={id}
                                                            value={id}
                                                        >
                                                            {dest.name}
                                                        </SelectItem>
                                                    );
                                                })
                                            ) : (
                                                <div className="px-2 py-3 text-center text-sm text-muted-foreground">No destinations available</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                );
                            }}
                        />
                        <p className="text-sm text-muted-foreground">Manage destinations in your settings</p>
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
                        initialValue={descriptionInitialValue}
                        onContentChange={(content: JSONContent) => {
                            setValue('description', content, { shouldDirty: true });
                        }}
                        placeholder="Describe the tour details..."
                        minHeight="300px"
                        enableAI={true}
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
                                        <Image
                                            src={coverImage}
                                            alt="Selected cover"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 50vw"
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
                                    <DialogContent className="!w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] left-1/2 -translate-x-1/2 max-h-[90vh] p-0">
                                        <VisuallyHidden>

                                            <DialogHeader className="px-6 pt-6 pb-4 border-b hidden">
                                                <DialogTitle className="text-left">
                                                    Choose Image From Gallery
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Select an image for your tour cover
                                                </DialogDescription>
                                            </DialogHeader>
                                        </VisuallyHidden>
                                        <div className="overflow-auto h-[calc(95vh-120px)]">
                                            <Gallery
                                                mode="picker"
                                                onMediaSelect={handleImageSelect}
                                                allowMultiple={false}
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
                                    <DialogContent className="!w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] left-1/2 -translate-x-1/2 max-h-[90vh] p-0">
                                        <VisuallyHidden>

                                            <DialogHeader className="px-6 pt-6 pb-4 border-b hidden">
                                                <DialogTitle className="text-left">
                                                    Choose PDF From Gallery
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Select a PDF file for your tour
                                                </DialogDescription>
                                            </DialogHeader>
                                        </VisuallyHidden>
                                        <div className="overflow-auto h-[calc(95vh-120px)]">
                                            <Gallery
                                                mode="picker"
                                                onMediaSelect={handlePdfSelect}
                                                allowMultiple={false}
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
                        <div className="space-y-0.5 flex-1">
                            <Label htmlFor="enquiry-switch" className="text-base cursor-pointer">
                                Enable Enquiries
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Allow users to send inquiries about this tour
                            </p>
                        </div>
                        {/* Enquiry Switch */}
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4">

                            <Controller
                                name="enquiry"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id="enquiry-switch"
                                        checked={field.value ?? true}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card >
    );
}
