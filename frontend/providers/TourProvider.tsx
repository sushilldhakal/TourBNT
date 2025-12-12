'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useForm, useFieldArray, FieldValues } from 'react-hook-form';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createTour, getSingleTour, updateTour } from '@/lib/api/tours';
import { toast } from '@/components/ui/use-toast';
import { useBreadcrumbs } from './BreadcrumbsProvider';
import makeId from '@/lib/utils/makeId';

/**
 * Tour Provider Context
 * Migrated from dashboard/src/Provider/TourContext.tsx
 * Manages tour form state, editor content, and CRUD operations
 */

// Types
export interface Tour {
    _id?: string;
    title: string;
    code: string;
    excerpt: string;
    description: any;
    tourStatus: 'draft' | 'published' | 'archived';
    coverImage: string;
    gallery: any[];
    category: any[];
    destination: any;
    pricing: any;
    pricingOptions: any[];
    dates: any;
    itinerary: any;
    include: any;
    exclude: any;
    facts: any[];
    faqs: any[];
}

interface TourContextType {
    form: any;
    tourId?: string;
    isEditing: boolean;
    editorContent: any;
    setEditorContent: (content: any) => void;
    inclusionsContent: any;
    setInclusionsContent: (content: any) => void;
    exclusionsContent: any;
    setExclusionsContent: (content: any) => void;
    itineraryContent: any;
    setItineraryContent: (content: any) => void;
    onSubmit: (values: FieldValues) => Promise<void>;
    isLoading: boolean;
    isSaving: boolean;

    // Field arrays
    itineraryFields: any[];
    appendItinerary: (value?: Partial<any>) => void;
    itineraryRemove: (index: number) => void;

    factsFields: any[];
    appendFacts: (value?: Partial<any>) => void;
    factsRemove: (index: number) => void;

    faqFields: any[];
    appendFaq: (value?: Partial<any>) => void;
    faqRemove: (index: number) => void;

    pricingOptionsFields: any[];
    appendPricingOptions: (value?: Partial<any>) => void;
    pricingOptionsRemove: (index: number) => void;

    dateRangeFields: any[];
    appendDateRange: (value?: Partial<any>) => void;
    dateRangeRemove: (index: number) => void;

    // Helper functions
    handleGenerateCode: () => string;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function useTourContext() {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTourContext must be used within TourProvider');
    }
    return context;
}

interface TourProviderProps {
    children: React.ReactNode;
    defaultValues?: Partial<Tour>;
    isEditing?: boolean;
}

export function TourProvider({ children, defaultValues, isEditing = false }: TourProviderProps) {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const tourId = params?.id as string | undefined;
    const { setBreadcrumbs } = useBreadcrumbs();

    // Editor states
    const [editorContent, setEditorContent] = useState<any>(null);
    const [inclusionsContent, setInclusionsContent] = useState<any>(null);
    const [exclusionsContent, setExclusionsContent] = useState<any>(null);
    const [itineraryContent, setItineraryContent] = useState<any>(null);

    // Initialize form
    const form = useForm<Tour>({
        defaultValues: defaultValues as any || {
            title: '',
            code: '',
            excerpt: '',
            tourStatus: 'draft',
            coverImage: '',
            gallery: [],
            category: [],
            pricing: {
                price: 0,
                pricePerPerson: true,
                minSize: 1,
                maxSize: 10,
            },
            pricingOptions: [],
            facts: [],
            faqs: [],
            itinerary: [],
            dates: {
                departures: []
            }
        },
    });

    // Set up field arrays for dynamic form fields
    const {
        fields: itineraryFields,
        append: itineraryAppend,
        remove: itineraryRemove,
    } = useFieldArray({
        control: form.control,
        name: 'itinerary',
    });

    const {
        fields: factsFields,
        append: factsAppend,
        remove: factsRemove,
    } = useFieldArray({
        control: form.control,
        name: 'facts',
    });

    const {
        fields: faqFields,
        append: faqAppend,
        remove: faqRemove,
    } = useFieldArray({
        control: form.control,
        name: 'faqs',
    });

    const {
        fields: pricingOptionsFields,
        append: pricingOptionsAppend,
        remove: pricingOptionsRemove,
    } = useFieldArray({
        control: form.control,
        name: 'pricingOptions',
    });

    const {
        fields: dateRangeFields,
        append: dateRangeAppend,
        remove: dateRangeRemove,
    } = useFieldArray({
        control: form.control,
        name: 'dates.departures',
    });

    // Create type-safe wrapper functions for field arrays
    // These ensure proper default values and type safety
    const appendItinerary = (value?: Partial<any>) => {
        const defaultItem = {
            day: '',
            title: '',
            description: '',
            destination: '',
            dateTime: new Date(),
        };
        itineraryAppend(value ? { ...defaultItem, ...value } : defaultItem);
    };

    const appendFacts = (value?: Partial<any>) => {
        const defaultItem = {
            title: '',
            icon: 'info',
            value: '',
            field_type: 'Plain Text',
        };
        factsAppend(value ? { ...defaultItem, ...value } : defaultItem);
    };

    const appendFaq = (value?: Partial<any>) => {
        const defaultItem = {
            question: '',
            answer: '',
        };
        faqAppend(value ? { ...defaultItem, ...value } : defaultItem);
    };

    const appendPricingOptions = (value?: Partial<any>) => {
        const defaultItem = {
            id: makeId(),
            name: '',
            category: 'adult' as const,
            customCategory: '',
            price: 0,
            discount: {
                enabled: false,
                options: [],
            },
            paxRange: {
                minPax: 1,
                maxPax: 10,
            },
        };
        pricingOptionsAppend(value ? { ...defaultItem, ...value } : defaultItem);
    };

    const appendDateRange = (value?: Partial<any>) => {
        const now = new Date();
        const toDate = new Date();
        toDate.setDate(now.getDate() + 7);

        const defaultItem = {
            id: makeId(),
            label: 'New Departure',
            dateRange: {
                from: now,
                to: toDate,
            },
            isRecurring: false,
            recurrencePattern: undefined,
            recurrenceEndDate: undefined,
            selectedPricingOptions: [],
        };
        dateRangeAppend(value ? { ...defaultItem, ...value } : defaultItem);
    };

    // Helper function to generate unique tour code
    const handleGenerateCode = () => {
        const generatedCode = makeId(6);
        form.setValue('code', generatedCode);
        return generatedCode;
    };

    // Data processing functions
    // Process categories from API format to form format
    const processCategories = (categories: unknown) => {
        if (categories === null || categories === undefined) return categories;
        if (typeof categories === 'string') {
            try {
                return JSON.parse(categories);
            } catch (e) {
                return categories;
            }
        }
        if (Array.isArray(categories)) {
            return categories.map((cat: Record<string, unknown>) => ({
                id: cat.value || cat.id,
                name: cat.label || cat.name,
                isActive: !cat.disable
            }));
        }
        return categories;
    };

    // Process itinerary from API format to form format
    const processItinerary = (itinerary: unknown) => {
        if (itinerary === null || itinerary === undefined) return itinerary;
        if (typeof itinerary === 'string') {
            try {
                return JSON.parse(itinerary);
            } catch (e) {
                return itinerary;
            }
        }
        if (Array.isArray(itinerary)) {
            return itinerary.map((item: Record<string, unknown>) => ({
                day: item.day,
                title: item.title,
                description: item.description,
                destination: item.destination || '',
                accommodation: item.accommodation || '',
                meals: item.meals || '',
                activities: item.activities || ''
            }));
        }
        return itinerary;
    };

    // Process pricing options from API format to form format
    const processPricingOptions = (pricingOptions: unknown) => {
        if (pricingOptions === null || pricingOptions === undefined) return pricingOptions;
        if (Array.isArray(pricingOptions)) {
            return pricingOptions.map((option: unknown, index: number) => {
                const opt = option as Record<string, any>;
                return {
                    id: opt.id || `pricing_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
                    name: opt.name || '',
                    category: opt.category || 'adult',
                    customCategory: opt.customCategory || '',
                    price: opt.price || 0,
                    paxRange: {
                        minPax: opt.paxRange?.minPax || opt.paxRange?.from || opt.minPax || 1,
                        maxPax: opt.paxRange?.maxPax || opt.paxRange?.to || opt.maxPax || 10
                    },
                    minPax: opt.paxRange?.from || opt.minPax || 1,
                    maxPax: opt.paxRange?.to || opt.maxPax || 10,
                    discount: {
                        discountEnabled: opt.discount?.discountEnabled || opt.discountEnabled || false,
                        percentageOrPrice: opt.discount?.percentageOrPrice || opt.percentageOrPrice || false,
                        discountPercentage: opt.discount?.discountPercentage || opt.discountPercentage || 0,
                        discountPrice: opt.discount?.discountPrice || opt.discountPrice || 0,
                        dateRange: opt.discount?.discountDateRange ? {
                            from: new Date(opt.discount.discountDateRange.from),
                            to: new Date(opt.discount.discountDateRange.to)
                        } : (opt.discountDateRange ? {
                            from: new Date(opt.discountDateRange.from),
                            to: new Date(opt.discountDateRange.to)
                        } : { from: new Date(), to: new Date() })
                    }
                };
            });
        }
        return pricingOptions;
    };

    // Process tour dates from API format to form format
    const processTourDates = (tourDates: any) => {
        if (!tourDates) return undefined;

        const processedDates = {
            days: tourDates.days || 0,
            nights: tourDates.nights || 0,
            scheduleType: tourDates.scheduleType || 'flexible',
            pricingCategory: Array.isArray(tourDates.pricingCategory)
                ? tourDates.pricingCategory
                : (tourDates.pricingCategory ? [tourDates.pricingCategory] : []),
            isRecurring: Boolean(tourDates.isRecurring),
            recurrencePattern: tourDates.recurrencePattern || 'weekly',
            recurrenceInterval: tourDates.recurrenceInterval || 1,
            recurrenceEndDate: tourDates.recurrenceEndDate ? new Date(tourDates.recurrenceEndDate) : undefined,
            // Process defaultDateRange for fixed dates
            dateRange: tourDates.defaultDateRange ? {
                from: new Date(tourDates.defaultDateRange.from),
                to: new Date(tourDates.defaultDateRange.to)
            } : undefined,
            // Process departures array for multiple departure dates
            departures: Array.isArray(tourDates.departures) ? tourDates.departures.map((dep: any) => {
                return {
                    id: dep.id || makeId(),
                    label: dep.label || 'Departure',
                    dateRange: dep.dateRange ? {
                        from: new Date(dep.dateRange.from),
                        to: new Date(dep.dateRange.to)
                    } : undefined,
                    days: dep.days || 0,
                    nights: dep.nights || 0,
                    isRecurring: Boolean(dep.isRecurring),
                    recurrencePattern: dep.recurrencePattern || undefined,
                    recurrenceInterval: dep.recurrenceInterval || undefined,
                    recurrenceEndDate: dep.recurrenceEndDate ? new Date(dep.recurrenceEndDate) : undefined,
                    pricingCategory: Array.isArray(dep.selectedPricingOptions)
                        ? dep.selectedPricingOptions
                        : (Array.isArray(dep.pricingCategory)
                            ? dep.pricingCategory
                            : (dep.pricingCategory ? [dep.pricingCategory] : [])),
                    capacity: dep.capacity || undefined
                };
            }) : []
        };

        return processedDates;
    };

    // Fetch tour data if editing
    const { data: fetchedTourData, isLoading } = useQuery({
        queryKey: ['tour', tourId],
        queryFn: () => getSingleTour(tourId!),
        enabled: !!tourId && isEditing,
    });

    // Update form when data is fetched
    useEffect(() => {
        if (fetchedTourData) {
            const tourData = fetchedTourData.data?.tour || fetchedTourData;

            // Process data before resetting form
            const processedData = {
                ...tourData,
                // Process categories using processCategories
                category: processCategories(tourData.category),
                // Process itinerary using processItinerary
                itinerary: processItinerary(tourData.itinerary),
                // Process pricing options using processPricingOptions
                pricingOptions: processPricingOptions(tourData.pricingOptions),
                // Process tour dates using processTourDates
                dates: processTourDates(tourData.dates),
                // Process facts preserving factId
                facts: Array.isArray(tourData.facts) ? tourData.facts.map((fact: any) => ({
                    factId: fact.factId || fact._id,
                    title: fact.title || '',
                    icon: fact.icon || 'info',
                    value: fact.value || '',
                    field_type: fact.field_type || 'Plain Text',
                })) : [],
                // Process FAQs preserving faqId
                faqs: Array.isArray(tourData.faqs) ? tourData.faqs.map((faq: any) => ({
                    faqId: faq.faqId || faq._id,
                    question: faq.question || '',
                    answer: faq.answer || '',
                })) : [],
            };

            form.reset(processedData);

            // Set breadcrumbs with tour title for dashboard
            if (tourData.title) {
                setBreadcrumbs([
                    { label: 'Tours', href: '/dashboard/tours' },
                    { label: tourData.title }
                ]);
            }

            // Handle include/exclude content parsing
            if (tourData.description) {
                try {
                    const desc = typeof tourData.description === 'string'
                        ? JSON.parse(tourData.description)
                        : tourData.description;
                    setEditorContent(desc);
                } catch (e) {
                    console.error('Error parsing description:', e);
                    setEditorContent(null);
                }
            }

            if (tourData.include) {
                try {
                    const inc = typeof tourData.include === 'string'
                        ? JSON.parse(tourData.include)
                        : tourData.include;
                    setInclusionsContent(inc);
                } catch (e) {
                    console.error('Error parsing inclusions:', e);
                    setInclusionsContent(null);
                }
            }

            if (tourData.exclude) {
                try {
                    const exc = typeof tourData.exclude === 'string'
                        ? JSON.parse(tourData.exclude)
                        : tourData.exclude;
                    setExclusionsContent(exc);
                } catch (e) {
                    console.error('Error parsing exclusions:', e);
                    setExclusionsContent(null);
                }
            }

            // Set itineraryContent if available
            if (tourData.itineraryContent) {
                try {
                    const itinContent = typeof tourData.itineraryContent === 'string'
                        ? JSON.parse(tourData.itineraryContent)
                        : tourData.itineraryContent;
                    setItineraryContent(itinContent);
                } catch (e) {
                    console.error('Error parsing itinerary content:', e);
                    setItineraryContent(null);
                }
            }
        }
    }, [fetchedTourData, form, setBreadcrumbs, tourId]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (formData: FormData) => createTour(formData),
        onSuccess: (data: any) => {
            toast({
                title: 'Success!',
                description: 'Tour created successfully',
            });
            queryClient.invalidateQueries({ queryKey: ['tours'] });
            // Handle different response structures
            const tourId = data?.tour?._id || data?._id;
            if (tourId) {
                router.push(`/dashboard/tours/edit/${tourId}`);
            } else {
                router.push('/dashboard/tours');
            }
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error creating tour',
                description: error.message || 'Failed to create tour',
            });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (formData: FormData) => updateTour(tourId!, formData),
        onSuccess: () => {
            toast({
                title: 'Success!',
                description: 'Tour updated successfully',
            });
            queryClient.invalidateQueries({ queryKey: ['tours'] });
            queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Error updating tour',
                description: error.message || 'Failed to update tour',
            });
        },
    });

    // Helper functions for form submission

    // Helper: recursively process values to remove functions, etc.
    const processValue = (value: unknown): unknown => {
        if (value === null || value === undefined) return value;
        if (typeof value === "function") {
            if (value === String) return "";
            if (value === Number) return 0;
            if (value === Boolean) return false;
            if (value === Date) return new Date();
            if (value === Array) return [];
            if (value === Object) return {};
            return null;
        }
        if (Array.isArray(value)) return value.map(processValue);
        if (typeof value === "object") {
            const result: Record<string, unknown> = {};
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    result[key] = processValue((value as Record<string, unknown>)[key]);
                }
            }
            return result;
        }
        return value;
    };

    // Helper: check if a field has changed
    const hasChanged = (key: string, newValue: unknown): boolean => {
        const originalTour = fetchedTourData?.data?.tour || fetchedTourData || {};

        // Special handling for gallery
        if (key === 'gallery') {
            return JSON.stringify(newValue) !== JSON.stringify(originalTour.gallery);
        }

        const parts = key.split(".");
        let origValue: unknown = originalTour;
        for (const part of parts) {
            if (origValue === null || origValue === undefined) {
                return true;
            }
            origValue = (origValue as Record<string, unknown>)[part];
        }
        if (origValue === undefined) return newValue !== undefined;
        if (Array.isArray(newValue)) {
            return (
                origValue === undefined ||
                !Array.isArray(origValue) ||
                origValue.length !== newValue.length ||
                JSON.stringify(origValue) !== JSON.stringify(newValue)
            );
        }
        if (typeof newValue === "object" && newValue !== null) {
            if (newValue instanceof Date) {
                return !(origValue instanceof Date) || (origValue as Date).getTime() !== (newValue as Date).getTime();
            }
            return JSON.stringify(origValue) !== JSON.stringify(newValue);
        }
        return origValue !== newValue;
    };

    // Helper: should a field be included in the submit
    const shouldIncludeField = (field: string, value: unknown, isCreating: boolean) => {
        // Always include gallery field if it has values
        if (field === 'gallery' && Array.isArray(value) && value.length > 0) {
            return true;
        }

        const shouldInclude = isCreating || hasChanged(field, value);
        return shouldInclude;
    };

    // Helper function to calculate days and nights from date range
    const calculateDaysNights = (dateRange: { from: Date; to: Date }) => {
        const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            days: diffDays,
            nights: Math.max(0, diffDays - 1)
        };
    };

    // Submit handler
    const onSubmit = async (values: FieldValues) => {
        const formData = new FormData();
        const processedValues = processValue(values) as Record<string, unknown>;
        const isCreating = !tourId;

        // Top-level fields to process
        const topLevelFields = [
            "title", "code", "excerpt", "description", "tourStatus", "coverImage",
            "file", "outline-solid", "include", "exclude", "map", "destination", "gallery"
        ];

        formData.append("id", tourId || "");
        let changedFieldCount = 0;

        // Process top-level fields
        topLevelFields.forEach((field) => {
            if (processedValues[field] !== undefined && shouldIncludeField(field, processedValues[field], isCreating)) {
                changedFieldCount++;

                // Process special fields (description, include, exclude)
                if (field === "description" && editorContent) {
                    formData.append(field, JSON.stringify(editorContent));
                } else if (field === "include" && inclusionsContent) {
                    formData.append(field, JSON.stringify(inclusionsContent));
                } else if (field === "exclude" && exclusionsContent) {
                    formData.append(field, JSON.stringify(exclusionsContent));
                } else if (field === "gallery") {
                    // Handle gallery data (remove temp IDs)
                    const galleryData = processedValues[field];
                    if (Array.isArray(galleryData)) {
                        const processedGallery = galleryData.map(item => {
                            if (typeof item === 'string') {
                                return item;
                            }

                            const cleanItem = { ...item };

                            // Remove client-side temporary ID if it exists
                            if (cleanItem.tempId) {
                                delete cleanItem.tempId;
                            }

                            // Only include _id if it's a valid MongoDB ObjectId (24 chars)
                            if (cleanItem._id && (typeof cleanItem._id !== 'string' || cleanItem._id.length !== 24)) {
                                delete cleanItem._id;
                            }

                            return cleanItem;
                        });

                        formData.append('gallery', JSON.stringify(processedGallery));
                    }
                } else if (field === "file") {
                    const fileValue = processedValues.file;
                    if (Array.isArray(fileValue) && fileValue.length > 0) {
                        formData.append(field, String(fileValue[0] || ""));
                    } else {
                        formData.append(field, String(fileValue || ""));
                    }
                } else {
                    formData.append(field, String(processedValues[field] || ""));
                }
            }
        });

        // Handle facts and FAQs
        if (values.facts && hasChanged('facts', values.facts)) {
            changedFieldCount++;
            formData.append("facts", JSON.stringify(values.facts));
        }

        if (values.faqs && hasChanged('faqs', values.faqs)) {
            changedFieldCount++;
            formData.append("faqs", JSON.stringify(values.faqs));
        }

        // Handle discount fields separately
        const discountData = values.pricing?.discount || values.discount;
        if (discountData) {
            changedFieldCount++;

            if (discountData.discountEnabled !== undefined) {
                formData.append("discountEnabled", String(discountData.discountEnabled));
            }
            if (discountData.discountPrice !== undefined) {
                formData.append("discountPrice", String(discountData.discountPrice));
            }
            if (discountData.dateRange) {
                formData.append("discountDateRange", JSON.stringify(discountData.dateRange));
            }
        }

        // Process dates with departures and calculate days/nights from date ranges
        if (shouldIncludeField('dates', values.dates, isCreating)) {
            changedFieldCount++;

            const datesData = values.dates || {};
            let calculatedDays: number | undefined;
            let calculatedNights: number | undefined;

            // Calculate days/nights based on schedule type
            if (datesData.scheduleType === 'flexible') {
                calculatedDays = datesData.days ? Number(datesData.days) : undefined;
                calculatedNights = datesData.nights ? Number(datesData.nights) : undefined;
            } else if (datesData.scheduleType === 'fixed' && datesData.dateRange) {
                const dateRange = {
                    from: new Date(datesData.dateRange.from),
                    to: new Date(datesData.dateRange.to)
                };
                const calculated = calculateDaysNights(dateRange);
                calculatedDays = calculated.days;
                calculatedNights = calculated.nights;
            } else if (datesData.scheduleType === 'multiple' && Array.isArray(datesData.departures) && datesData.departures.length > 0) {
                const firstDeparture = datesData.departures[0];
                if (firstDeparture?.dateRange) {
                    const dateRange = {
                        from: new Date(firstDeparture.dateRange.from),
                        to: new Date(firstDeparture.dateRange.to)
                    };
                    const calculated = calculateDaysNights(dateRange);
                    calculatedDays = calculated.days;
                    calculatedNights = calculated.nights;
                }
            } else {
                calculatedDays = datesData.days ? Number(datesData.days) : undefined;
                calculatedNights = datesData.nights ? Number(datesData.nights) : undefined;
            }

            // Create formatted dates object
            const formattedDates = {
                scheduleType: datesData.scheduleType || 'flexible',
                days: calculatedDays,
                nights: calculatedNights,
                dateRange: datesData.dateRange ? {
                    from: new Date(datesData.dateRange.from),
                    to: new Date(datesData.dateRange.to)
                } : undefined,
                isRecurring: Boolean(datesData.isRecurring),
                recurrencePattern: datesData.recurrencePattern || undefined,
                recurrenceInterval: datesData.recurrenceInterval ? Number(datesData.recurrenceInterval) : undefined,
                recurrenceEndDate: datesData.recurrenceEndDate ? new Date(datesData.recurrenceEndDate) : undefined,
                pricingCategory: datesData.pricingCategory || undefined,
                departures: Array.isArray(datesData.departures) ? datesData.departures.map((departure: any) => {
                    let depDays: number | undefined;
                    let depNights: number | undefined;

                    if (departure.dateRange) {
                        const depDateRange = {
                            from: new Date(departure.dateRange.from),
                            to: new Date(departure.dateRange.to)
                        };
                        const calculated = calculateDaysNights(depDateRange);
                        depDays = calculated.days;
                        depNights = calculated.nights;
                    }

                    return {
                        id: departure.id || makeId(),
                        label: departure.label || 'Departure',
                        dateRange: departure.dateRange ? {
                            from: new Date(departure.dateRange.from),
                            to: new Date(departure.dateRange.to)
                        } : undefined,
                        days: depDays,
                        nights: depNights,
                        isRecurring: Boolean(departure.isRecurring),
                        recurrencePattern: departure.recurrencePattern || undefined,
                        recurrenceInterval: departure.recurrenceInterval ? Number(departure.recurrenceInterval) : undefined,
                        recurrenceEndDate: departure.recurrenceEndDate ? new Date(departure.recurrenceEndDate) : undefined,
                        pricingCategory: departure.pricingCategory || undefined,
                        capacity: departure.capacity ? Number(departure.capacity) : undefined
                    };
                }) : []
            };

            formData.append("dates", JSON.stringify(formattedDates));
        }

        // Process pricing data
        if (shouldIncludeField('price', values.price, isCreating) ||
            shouldIncludeField('minSize', values.minSize, isCreating) ||
            shouldIncludeField('maxSize', values.maxSize, isCreating) ||
            shouldIncludeField('discountEnabled', values.discountEnabled, isCreating) ||
            shouldIncludeField('priceLockedUntil', values.pricing?.priceLockedUntil, isCreating)) {
            changedFieldCount++;

            let minSizeValue = 1;
            let maxSizeValue = 10;

            if (values.minSize !== undefined && values.minSize !== null) {
                minSizeValue = Number(values.minSize);
            } else if (values.pricing?.minSize !== undefined && values.pricing.minSize !== null) {
                minSizeValue = Number(values.pricing.minSize);
            }

            if (values.maxSize !== undefined && values.maxSize !== null) {
                maxSizeValue = Number(values.maxSize);
            } else if (values.pricing?.maxSize !== undefined && values.pricing.maxSize !== null) {
                maxSizeValue = Number(values.pricing.maxSize);
            }

            const pricingObject: any = {
                price: Number(values.price) || 0,
                originalPrice: Number(values.originalPrice) || 0,
                basePrice: Number(values.basePrice) || 0,
                minSize: minSizeValue,
                maxSize: maxSizeValue,
                discountEnabled: Boolean(values.pricing?.discount?.discountEnabled || values.discountEnabled),
                discountPrice: Number(values.pricing?.discount?.discountPrice || values.discountPrice || 0),
                pricePerPerson: values.pricing?.pricePerPerson !== undefined ? Boolean(values.pricing.pricePerPerson) : true
            };

            if (values.pricing?.priceLockedUntil) {
                pricingObject.priceLockDate = new Date(values.pricing.priceLockedUntil);
            }

            const discountForDates = values.pricing?.discount;
            if (discountForDates?.dateRange) {
                const fromDate = discountForDates.dateRange.from ? new Date(discountForDates.dateRange.from) : new Date();
                const toDate = discountForDates.dateRange.to ? new Date(discountForDates.dateRange.to) : new Date();

                pricingObject.discountDateRange = {
                    from: !isNaN(fromDate.getTime()) ? fromDate : new Date(),
                    to: !isNaN(toDate.getTime()) ? toDate : new Date()
                };
            }

            formData.append("pricing", JSON.stringify(pricingObject));
            formData.append("price", String(Number(values.price) || 0));
            formData.append("minSize", String(minSizeValue));
            formData.append("maxSize", String(maxSizeValue));
            formData.append("pricePerPerson", String(Boolean(pricingObject.pricePerPerson)));
            if (values.discountEnabled !== undefined) {
                formData.append("discountEnabled", String(Boolean(values.discountEnabled)));
            }
        }

        // Format pricing options with discounts
        if (values.pricingOptions && Array.isArray(values.pricingOptions) && values.pricingOptions.length > 0) {
            const flatPricingOptions = values.pricingOptions.map((option: any, index: number) => {
                const optionId = option.id || `option_${Date.now()}_${index}`;
                const optionDiscount = option.discount;
                const hasOptionDiscount = optionDiscount && optionDiscount.discountEnabled;

                let minPax = option.minPax ? Number(option.minPax) : 1;
                let maxPax = option.maxPax ? Number(option.maxPax) : 22;

                if (Array.isArray(option.paxRange)) {
                    if (option.paxRange[0] !== undefined && option.paxRange[0] !== null) {
                        minPax = Number(option.paxRange[0]) || minPax;
                    }
                    if (option.paxRange[1] !== undefined && option.paxRange[1] !== null) {
                        maxPax = Number(option.paxRange[1]) || maxPax;
                    }
                } else if (option.paxRange && typeof option.paxRange === 'object') {
                    if (option.paxRange.from !== undefined) {
                        minPax = Number(option.paxRange.from) || minPax;
                    }
                    if (option.paxRange.to !== undefined) {
                        maxPax = Number(option.paxRange.to) || maxPax;
                    }
                }

                return {
                    id: optionId,
                    name: option.name || "",
                    category: option.category || "adult",
                    customCategory: option.customCategory || "",
                    price: option.price ? Number(option.price) : 0,
                    discount: hasOptionDiscount ? {
                        discountEnabled: true,
                        discountPrice: optionDiscount.discountPrice ? Number(optionDiscount.discountPrice) : 0,
                        discountDateRange: optionDiscount.dateRange ? {
                            from: new Date(optionDiscount.dateRange.from),
                            to: new Date(optionDiscount.dateRange.to)
                        } : undefined,
                        percentageOrPrice: Boolean(optionDiscount.percentageOrPrice),
                        discountPercentage: optionDiscount.percentageOrPrice ? Number(optionDiscount.discountPercentage) : undefined,
                    } : {
                        discountEnabled: false
                    },
                    paxRange: {
                        from: minPax,
                        to: maxPax
                    },
                    minPax: minPax,
                    maxPax: maxPax
                };
            });

            formData.append("pricingOptions", JSON.stringify(flatPricingOptions));
            formData.append("pricingOptionsEnabled", String(true));
        }

        // Handle boolean fields
        ['enquiry', 'features'].forEach(key => {
            if (values[key] !== undefined && shouldIncludeField(key, values[key], isCreating)) {
                changedFieldCount++;
                const boolValue = values[key] ? "true" : "false";
                formData.append(key, boolValue);
            }
        });

        // Format category data properly
        if (values.category && Array.isArray(values.category) && hasChanged('category', values.category)) {
            changedFieldCount++;
            const formattedCategory = values.category.map((item: any) => ({
                categoryId: typeof item.categoryId === 'function' ? item.categoryId() :
                    item.categoryId || item.id || item.value || '',
                categoryName: typeof item.categoryName === 'function' ? item.categoryName() :
                    item.categoryName || item.name || item.label || '',
                disable: Boolean(item.disable || !item.isActive)
            }));
            formData.append("category", JSON.stringify(formattedCategory));
        }

        // Handle itinerary
        if (values.itinerary !== undefined && shouldIncludeField('itinerary', values.itinerary, isCreating)) {
            changedFieldCount++;

            let itineraryItems = [];

            if (values.itinerary && typeof values.itinerary === 'object' && Array.isArray(values.itinerary.options)) {
                itineraryItems = values.itinerary.options;
            } else if (Array.isArray(values.itinerary)) {
                itineraryItems = values.itinerary;
            } else if (values.itinerary && values.itinerary.length !== undefined) {
                itineraryItems = Array.from(values.itinerary);
            }

            const formattedItinerary = itineraryItems.map((item: any) => {
                return {
                    day: item.day || '',
                    title: typeof item.title === 'string' ? item.title : String(item.title || ''),
                    description: typeof item.description === 'string' ? item.description : String(item.description || ''),
                    dateTime: item.dateTime instanceof Date ? item.dateTime : new Date(),
                    destination: item.destination || '',
                };
            });

            formData.append("itinerary", JSON.stringify(formattedItinerary));
        }

        // Handle location data
        if (processedValues.location && shouldIncludeField("location", processedValues.location, isCreating)) {
            changedFieldCount++;
            const locationData = processedValues.location as Record<string, unknown>;
            const originalTour = fetchedTourData?.data?.tour || fetchedTourData || {};
            const fullLocation = {
                map: locationData.map || originalTour.location?.map || "",
                zip: locationData.zip || originalTour.location?.zip || "",
                street: locationData.street || originalTour.location?.street || "",
                city: locationData.city || originalTour.location?.city || "",
                state: locationData.state || originalTour.location?.state || "",
                country: locationData.country || originalTour.location?.country || "",
                lat: locationData.lat?.toString() || "0",
                lng: locationData.lng?.toString() || "0",
            };
            formData.append("location", JSON.stringify(fullLocation));
        }

        // Execute mutation only if there are changed fields
        if (changedFieldCount > 0) {
            if (isEditing && tourId) {
                await updateMutation.mutateAsync(formData);
            } else {
                await createMutation.mutateAsync(formData);
            }
        }
    };

    const contextValue: TourContextType = {
        form,
        tourId,
        isEditing,
        editorContent,
        setEditorContent,
        inclusionsContent,
        setInclusionsContent,
        exclusionsContent,
        setExclusionsContent,
        itineraryContent,
        setItineraryContent,
        onSubmit,
        isLoading,
        isSaving: createMutation.isPending || updateMutation.isPending,

        // Field arrays
        itineraryFields,
        appendItinerary,
        itineraryRemove,

        factsFields,
        appendFacts,
        factsRemove,

        faqFields,
        appendFaq,
        faqRemove,

        pricingOptionsFields,
        appendPricingOptions,
        pricingOptionsRemove,

        dateRangeFields,
        appendDateRange,
        dateRangeRemove,

        // Helper functions
        handleGenerateCode,
    };

    return <TourContext.Provider value={contextValue}>{children}</TourContext.Provider>;
}
