'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray, type UseFormReturn, type FieldArrayWithId } from 'react-hook-form';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createTour, getSingleTour, updateTour } from '@/lib/api/tours';
import { toast } from '@/components/ui/use-toast';
import { useBreadcrumbs } from './BreadcrumbsProvider';
import makeId from '@/lib/utils/makeId';
import type { Tour } from '@/types/types';
import type {
    EditorCategory,
    EditorDates,
    EditorDateRange,
    EditorDiscount,
    EditorFact,
    EditorFaq,
    EditorGalleryItem,
    EditorItineraryDay,
    EditorPricing,
    EditorPricingOption,
    FactFieldType,
    PricingCategory,
    RichTextDoc,
    ScheduleType,
    TourEditorValues,
} from '@/types/tourEditor';

/**
 * Tour Provider Context
 * Manages the tour editor's form state and saving. The form holds TourEditorValues (see types/tourEditor.ts);
 * `tourToEditorValues` and `buildTourFormData` below are the only places that convert to and from the API.
 */

interface TourContextType {
    form: UseFormReturn<TourEditorValues>;
    tourId?: string;
    isEditing: boolean;
    /** Rich text as loaded, for the editors' initial value. Edits live in the form (description/include/exclude). */
    editorContent: RichTextDoc | null;
    inclusionsContent: RichTextDoc | null;
    exclusionsContent: RichTextDoc | null;
    outlineContent: RichTextDoc | null;
    onSubmit: (values: TourEditorValues) => Promise<void>;
    isLoading: boolean;
    isSaving: boolean;

    // Field arrays
    factsFields: FieldArrayWithId<TourEditorValues, 'facts', 'id'>[];
    appendFacts: (value?: Partial<EditorFact>) => void;
    factsRemove: (index: number) => void;
    factsMove: (from: number, to: number) => void;

    galleryFields: FieldArrayWithId<TourEditorValues, 'gallery', 'id'>[];
    appendGallery: (value?: Partial<EditorGalleryItem>) => void;
    galleryRemove: (index: number) => void;
    galleryMove: (from: number, to: number) => void;

    faqFields: FieldArrayWithId<TourEditorValues, 'faqs', 'id'>[];
    appendFaq: (value?: Partial<EditorFaq>) => void;
    faqRemove: (index: number) => void;
    faqMove: (from: number, to: number) => void;

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
    isEditing?: boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultDiscount = (): EditorDiscount => ({ discountEnabled: false, type: 'percentage', value: 0 });

const DEFAULT_VALUES: TourEditorValues = {
    title: '',
    code: '',
    excerpt: '',
    tourStatus: 'Draft',
    coverImage: '',
    enquiry: true,
    category: [],
    gallery: [],
    facts: [],
    faqs: [],
    itinerary: { options: [[]] },
    pricing: {
        price: 0,
        pricePerPerson: true,
        minSize: 1,
        maxSize: 10,
        pricingOptionsEnabled: false,
        pricingOptions: [],
        discount: defaultDiscount(),
        paymentOptions: {
            fullPaymentEnabled: true,
            depositEnabled: false,
            depositPercentage: 20,
            payOnArrivalEnabled: false,
        },
    },
    dates: {
        scheduleType: 'flexible',
        days: 0,
        nights: 0,
        isRecurring: false,
        pricingCategory: [],
        departures: [],
    },
};

// ---------------------------------------------------------------------------
// API tour -> editor values
// ---------------------------------------------------------------------------

const toDateRange = (range?: { from?: string | Date; to?: string | Date }): EditorDateRange | undefined =>
    range?.from && range?.to ? { from: new Date(range.from), to: new Date(range.to) } : undefined;

/** The API keeps a discount as percentageOrPrice + discountPercentage / discountPrice; the editor as type + value. */
const toEditorDiscount = (d?: {
    discountEnabled?: boolean;
    percentageOrPrice?: boolean;
    discountPercentage?: number;
    discountPrice?: number;
    discountDateRange?: { from?: string | Date; to?: string | Date };
    discountCode?: string;
    description?: string;
}): EditorDiscount => ({
    discountEnabled: Boolean(d?.discountEnabled),
    type: d?.percentageOrPrice ? 'percentage' : 'price',
    value: (d?.percentageOrPrice ? d?.discountPercentage : d?.discountPrice) ?? 0,
    dateRange: toDateRange(d?.discountDateRange),
    discountCode: d?.discountCode,
    description: d?.description,
});

const PRICING_CATEGORIES: readonly PricingCategory[] = ['adult', 'child', 'senior', 'student', 'custom'];
const SCHEDULE_TYPES: readonly ScheduleType[] = ['flexible', 'fixed', 'multiple'];
const FACT_TYPES: readonly FactFieldType[] = ['Plain Text', 'Single Select', 'Multi Select'];

/** Reads rich text stored as a JSON document (or a JSON string of one); anything else isn't editor content. */
const toRichTextDoc = (value: unknown): RichTextDoc | null => {
    let doc = value;
    if (typeof doc === 'string') {
        try { doc = JSON.parse(doc); } catch { return null; }
    }
    return doc && typeof doc === 'object' && !Array.isArray(doc) && 'type' in doc ? (doc as RichTextDoc) : null;
};

/** Rich text from a stored value, wrapping plain text (older tours) in a paragraph so the editor can show it. */
const toEditableDoc = (value: unknown): RichTextDoc | null => {
    const doc = toRichTextDoc(value);
    if (doc || typeof value !== 'string' || !value.trim()) return doc;
    return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] };
};

function tourToEditorValues(tour: Tour): TourEditorValues {
    const pricingOptions: EditorPricingOption[] = (tour.pricingOptions ?? []).map((opt, index) => ({
        id: opt.id || opt._id || `pricing_${Date.now()}_${index}`,
        name: opt.name || '',
        category: PRICING_CATEGORIES.includes(opt.category) ? opt.category : 'adult',
        customCategory: opt.customCategory || '',
        price: opt.price || 0,
        isActive: opt.isActive,
        paxRange: { min: opt.paxRange?.minPax ?? 1, max: opt.paxRange?.maxPax ?? 22 },
        discount: toEditorDiscount({ ...opt.discount, discountEnabled: opt.discount?.discountEnabled ?? opt.discountEnabled }),
    }));

    const pricing: EditorPricing = {
        price: tour.price ?? 0,
        originalPrice: tour.originalPrice,
        pricePerPerson: tour.pricePerPerson ?? true,
        minSize: tour.minSize ?? 1,
        maxSize: tour.maxSize ?? 10,
        groupSize: tour.groupSize ?? undefined,
        pricingOptionsEnabled: tour.pricingOptionsEnabled ?? false,
        pricingOptions,
        discount: toEditorDiscount(tour.discount),
        priceLockDate: tour.priceLockDate ? new Date(tour.priceLockDate) : undefined,
        paymentOptions: tour.paymentOptions ?? DEFAULT_VALUES.pricing.paymentOptions,
    };

    const td = tour.tourDates;
    const dates: EditorDates = td
        ? {
            scheduleType: SCHEDULE_TYPES.includes(td.scheduleType as ScheduleType) ? (td.scheduleType as ScheduleType) : 'fixed',
            days: td.days ?? 0,
            nights: td.nights ?? 0,
            dateRange: toDateRange(td.defaultDateRange),
            isRecurring: Boolean(td.isRecurring),
            recurrencePattern: td.recurrencePattern,
            recurrenceInterval: td.recurrenceInterval,
            recurrenceEndDate: td.recurrenceEndDate ? new Date(td.recurrenceEndDate) : undefined,
            pricingCategory: td.pricingCategory ?? td.selectedPricingOptions ?? [],
            departures: (td.departures ?? []).map((dep) => ({
                id: dep.id || makeId(),
                label: dep.label || 'Departure',
                dateRange: toDateRange(dep.dateRange),
                isRecurring: Boolean(dep.isRecurring),
                recurrencePattern: dep.recurrencePattern,
                recurrenceInterval: dep.recurrenceInterval,
                recurrenceEndDate: dep.recurrenceEndDate ? new Date(dep.recurrenceEndDate) : undefined,
                pricingCategory: dep.selectedPricingOptions ?? dep.pricingCategory ?? [],
                capacity: dep.capacity,
            })),
        }
        : DEFAULT_VALUES.dates;

    const category: EditorCategory[] = (tour.category ?? []).map((cat) => ({
        label: cat.name || cat.id,
        value: cat.id,
        id: cat.id,
        name: cat.name,
        disable: false,
    }));

    // The API stores a flat list of days; the editor works on { outline, options: [days] }. Keep each day's id and
    // partners[] — they carry the linked hotel/restaurant/guide/transport.
    const days: EditorItineraryDay[] = (tour.itinerary ?? []).map((item) => ({
        id: item.id,
        day: item.day || '',
        title: item.title || '',
        description: item.description || '',
        destination: item.destination || '',
        date: item.date,
        partners: item.partners ?? [],
    }));

    return {
        title: tour.title ?? '',
        code: tour.code ?? '',
        excerpt: tour.excerpt ?? '',
        tourStatus: tour.tourStatus ?? 'Draft',
        description: toRichTextDoc(tour.description) ?? tour.description ?? undefined,
        coverImage: tour.coverImage ?? '',
        file: tour.file ?? undefined,
        outline: toEditableDoc(tour.outline) ?? undefined,
        enquiry: tour.enquiry ?? true,
        destination: tour.destinationId ?? undefined,
        location: tour.location
            ? { map: tour.location.map, zip: tour.location.zip, street: tour.location.street, city: tour.location.city, state: tour.location.state, country: tour.location.country, lat: tour.location.lat, lng: tour.location.lng }
            : undefined,
        include: toRichTextDoc(tour.include) ?? undefined,
        exclude: toRichTextDoc(tour.exclude) ?? undefined,
        category,
        gallery: (tour.gallery ?? []).map((g) => ({ _id: g.id, image: g.image, caption: g.caption })),
        facts: (tour.facts ?? []).map((fact) => ({
            factId: fact.factId,
            name: fact.title || fact.name || '',
            title: fact.title || fact.name || '',
            icon: fact.icon || 'info',
            field_type: FACT_TYPES.includes(fact.field_type as FactFieldType) ? (fact.field_type as FactFieldType) : 'Plain Text',
            value: fact.value ?? '',
        })),
        faqs: (tour.faqs ?? []).map((faq) => ({ faqId: faq.faqId, question: faq.question || '', answer: faq.answer || '' })),
        itinerary: { options: [days] },
        pricing,
        dates,
    };
}

// ---------------------------------------------------------------------------
// Editor values -> API request
// ---------------------------------------------------------------------------

/** A comparable form of a value: Dates as ISO strings, so a snapshot and the current form compare cleanly. */
const comparable = (value: unknown): string => JSON.stringify(value ?? null);

/** The API's discount shape. */
const toApiDiscount = (d: EditorDiscount) => ({
    discountEnabled: d.discountEnabled,
    percentageOrPrice: d.type === 'percentage',
    discountPercentage: d.type === 'percentage' ? Number(d.value) || 0 : 0,
    discountPrice: d.type === 'price' ? Number(d.value) || 0 : 0,
    ...(d.dateRange ? { dateRange: d.dateRange, discountDateRange: d.dateRange } : {}),
    ...(d.discountCode ? { discountCode: d.discountCode } : {}),
    ...(d.description ? { description: d.description } : {}),
});

const daysAndNights = (range: EditorDateRange) => {
    const days = Math.ceil(Math.abs(new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000);
    return { days, nights: Math.max(0, days - 1) };
};

const richTextField = (value: RichTextDoc | string | undefined): string =>
    typeof value === 'string' ? value : JSON.stringify(value ?? '');

/**
 * The multipart request for a save. On create everything is sent; on update only the sections that differ
 * from what was loaded (`original`), so the server leaves the rest of the tour alone.
 */
function buildTourFormData(values: TourEditorValues, original: TourEditorValues | null): { formData: FormData; changed: number } {
    const formData = new FormData();
    let changed = 0;
    const isDifferent = <K extends keyof TourEditorValues>(key: K) => !original || comparable(values[key]) !== comparable(original[key]);
    const send = (key: string, value: string) => {
        formData.append(key, value);
        changed++;
    };

    for (const key of ['title', 'code', 'excerpt', 'tourStatus', 'coverImage', 'file', 'destination', 'map'] as const) {
        if (values[key] !== undefined && isDifferent(key)) send(key, String(values[key] ?? ''));
    }
    if (isDifferent('enquiry')) send('enquiry', values.enquiry ? 'true' : 'false');
    for (const key of ['description', 'include', 'exclude', 'outline'] as const) {
        if (values[key] !== undefined && isDifferent(key)) send(key, richTextField(values[key]));
    }

    if (isDifferent('gallery')) {
        send('gallery', JSON.stringify(values.gallery.filter((g) => g.image).map((g) => ({ image: g.image, ...(g.caption ? { caption: g.caption } : {}) }))));
    }
    if (isDifferent('facts')) {
        send('facts', JSON.stringify(values.facts.map((f) => ({ factId: f.factId, title: f.title || f.name || '', field_type: f.field_type, value: f.value, icon: f.icon }))));
    }
    if (isDifferent('faqs')) {
        send('faqs', JSON.stringify(values.faqs.map((f) => ({ faqId: f.faqId, question: f.question, answer: f.answer }))));
    }
    if (isDifferent('category')) {
        send('category', JSON.stringify(values.category.map((c) => ({ categoryId: c.id || c.value, categoryName: c.name || c.label }))));
    }
    if (isDifferent('itinerary')) {
        const days = values.itinerary.options[0] ?? [];
        send('itinerary', JSON.stringify(days.map((day) => ({
            ...(day.id ? { id: day.id } : {}),
            day: day.day || '',
            title: day.title || '',
            description: day.description || '',
            destination: day.destination || '',
            ...(day.date ? { date: day.date } : {}),
            // Linked hotel / restaurant / guide / transport for the day.
            partners: day.partners ?? [],
        }))));
    }
    if (values.location && isDifferent('location')) {
        const l = values.location;
        send('location', JSON.stringify({ map: l.map ?? '', zip: l.zip ?? '', street: l.street ?? '', city: l.city ?? '', state: l.state ?? '', country: l.country ?? '', lat: String(l.lat ?? 0), lng: String(l.lng ?? 0) }));
    }

    if (isDifferent('dates')) {
        const d = values.dates;
        const firstDeparture = d.departures[0]?.dateRange;
        const span = d.scheduleType === 'fixed' && d.dateRange ? daysAndNights(d.dateRange)
            : d.scheduleType === 'multiple' && firstDeparture ? daysAndNights(firstDeparture)
                : { days: Number(d.days) || undefined, nights: Number(d.nights) || undefined };
        send('dates', JSON.stringify({
            scheduleType: d.scheduleType,
            ...span,
            dateRange: d.dateRange,
            isRecurring: d.isRecurring,
            recurrencePattern: d.recurrencePattern,
            recurrenceInterval: d.recurrenceInterval ? Number(d.recurrenceInterval) : undefined,
            recurrenceEndDate: d.recurrenceEndDate,
            pricingCategory: d.pricingCategory,
            departures: d.departures.map((dep) => ({
                id: dep.id || makeId(),
                label: dep.label || 'Departure',
                dateRange: dep.dateRange,
                ...(dep.dateRange ? daysAndNights(dep.dateRange) : {}),
                isRecurring: dep.isRecurring,
                recurrencePattern: dep.recurrencePattern,
                recurrenceInterval: dep.recurrenceInterval ? Number(dep.recurrenceInterval) : undefined,
                recurrenceEndDate: dep.recurrenceEndDate,
                selectedPricingOptions: dep.pricingCategory,
                pricingCategory: dep.pricingCategory,
                capacity: dep.capacity ? Number(dep.capacity) : undefined,
            })),
        }));
    }

    if (isDifferent('pricing')) {
        const p = values.pricing;
        send('pricing', JSON.stringify({
            pricePerPerson: p.pricePerPerson,
            pricingOptionsEnabled: p.pricingOptionsEnabled,
            paymentOptions: p.paymentOptions,
            discount: toApiDiscount(p.discount),
            ...(p.priceLockDate ? { priceLockDate: p.priceLockDate } : {}),
        }));
        formData.append('price', String(Number(p.price) || 0));
        formData.append('minSize', String(Number(p.minSize) || 1));
        formData.append('maxSize', String(Number(p.maxSize) || 10));
        if (!p.pricePerPerson) formData.append('groupSize', String(Number(p.groupSize) || 1));
        formData.append('pricingOptions', JSON.stringify(p.pricingOptions.map((option) => ({
            id: option.id,
            name: option.name || '',
            category: option.category || 'adult',
            customCategory: option.customCategory || '',
            price: Number(option.price) || 0,
            paxRange: { minPax: Number(option.paxRange?.min) || 1, maxPax: Number(option.paxRange?.max) || 22 },
            discount: option.discount ? toApiDiscount(option.discount) : { discountEnabled: false },
        }))));
    }

    return { formData, changed };
}

/** The tour id in a create response ({ tour } or the tour itself). */
const createdTourId = (data: unknown): string | undefined => {
    const d = data as { id?: string; _id?: string; tour?: { id?: string; _id?: string } } | undefined;
    return d?.tour?.id || d?.id || d?.tour?._id || d?._id;
};

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TourProvider({ children, isEditing = false }: TourProviderProps) {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const tourId = params?.id as string | undefined;
    const { setBreadcrumbs } = useBreadcrumbs();

    const form = useForm<TourEditorValues>({ defaultValues: DEFAULT_VALUES });

    const { fields: factsFields, append: factsAppend, remove: factsRemove, move: factsMove } = useFieldArray({ control: form.control, name: 'facts' });
    const { fields: faqFields, append: faqAppend, remove: faqRemove, move: faqMove } = useFieldArray({ control: form.control, name: 'faqs' });
    const { fields: galleryFields, append: galleryAppend, remove: galleryRemove, move: galleryMove } = useFieldArray({ control: form.control, name: 'gallery' });

    const appendFacts = (value?: Partial<EditorFact>) =>
        factsAppend({ title: '', icon: 'info', value: '', field_type: 'Plain Text', ...value });
    const appendGallery = (value?: Partial<EditorGalleryItem>) =>
        galleryAppend({ tempId: makeId(), image: '', caption: '', ...value });
    const appendFaq = (value?: Partial<EditorFaq>) =>
        faqAppend({ question: '', answer: '', ...value });

    const handleGenerateCode = () => {
        const generatedCode = makeId();
        form.setValue('code', generatedCode, { shouldDirty: true });
        return generatedCode;
    };

    // Fetch tour data if editing
    const { data: fetchedTourData, isLoading } = useQuery({
        queryKey: ['tour', tourId],
        queryFn: () => getSingleTour(tourId!),
        enabled: !!tourId && isEditing,
    });
    const loadedTour = fetchedTourData?.tour;

    // The values as loaded: the form starts from these, and a save sends only what differs from them.
    const loadedValues = useMemo(() => (loadedTour ? tourToEditorValues(loadedTour) : null), [loadedTour]);
    const savedValuesRef = useRef<TourEditorValues | null>(null);

    useEffect(() => {
        if (!loadedValues) return;
        savedValuesRef.current = loadedValues;
        form.reset(loadedValues);
        if (loadedValues.title) {
            setBreadcrumbs([{ label: 'Tours', href: '/dashboard/tours' }, { label: loadedValues.title }]);
        }
    }, [loadedValues, form, setBreadcrumbs]);

    // Initial content for the rich-text editors.
    const editorContent = useMemo(() => toRichTextDoc(loadedTour?.description), [loadedTour]);
    const inclusionsContent = useMemo(() => toRichTextDoc(loadedTour?.include), [loadedTour]);
    const exclusionsContent = useMemo(() => toRichTextDoc(loadedTour?.exclude), [loadedTour]);
    const outlineContent = useMemo(() => toEditableDoc(loadedTour?.outline), [loadedTour]);

    const createMutation = useMutation({
        mutationFn: (formData: FormData) => createTour(formData),
        onSuccess: (data) => {
            toast({ title: 'Success!', description: 'Tour created successfully' });
            queryClient.invalidateQueries({ queryKey: ['tours'] });
            const newId = createdTourId(data);
            router.push(newId ? `/dashboard/tours/edit/${newId}` : '/dashboard/tours');
        },
        onError: (error) => {
            toast({ variant: 'destructive', title: 'Error creating tour', description: errorMessage(error, 'Failed to create tour') });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (formData: FormData) => updateTour(tourId!, formData),
        onSuccess: () => {
            toast({ title: 'Success!', description: 'Tour updated successfully' });
            queryClient.invalidateQueries({ queryKey: ['tours'] });
            queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        },
        onError: (error) => {
            toast({ variant: 'destructive', title: 'Error updating tour', description: errorMessage(error, 'Failed to update tour') });
        },
    });

    const onSubmit = async (values: TourEditorValues) => {
        const editingExisting = isEditing && !!tourId;
        const { formData, changed } = buildTourFormData(values, editingExisting ? savedValuesRef.current : null);
        if (changed === 0) {
            toast({ title: 'Nothing to save', description: 'No changes since the last save.' });
            return;
        }
        if (editingExisting) {
            await updateMutation.mutateAsync(formData);
            savedValuesRef.current = values;
        } else {
            await createMutation.mutateAsync(formData);
        }
    };

    const contextValue: TourContextType = {
        form,
        tourId,
        isEditing,
        editorContent,
        inclusionsContent,
        exclusionsContent,
        outlineContent,
        onSubmit,
        isLoading,
        isSaving: createMutation.isPending || updateMutation.isPending,

        factsFields,
        appendFacts,
        factsRemove,
        factsMove,

        galleryFields,
        appendGallery,
        galleryRemove,
        galleryMove,

        faqFields,
        appendFaq,
        faqRemove,
        faqMove,

        handleGenerateCode,
    };

    return <TourContext.Provider value={contextValue}>{children}</TourContext.Provider>;
}
