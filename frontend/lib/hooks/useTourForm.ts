/**
 * useTourForm Hook
 * Custom hook for managing tour form state with react-hook-form
 * Handles form initialization, field arrays, and form reset for edit mode
 */

import { useForm, useFieldArray, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { getTourFormSchema, TourFormData, TourEditData } from '@/lib/schemas/tourEditor';
import { getTourWithDefaults } from '@/lib/utils/defaultTourValues';

interface UseTourFormOptions {
    isEditing?: boolean;
    defaultValues?: Partial<TourFormData>;
    onSubmit?: (data: TourFormData | TourEditData) => void | Promise<void>;
}

interface UseTourFormReturn {
    form: UseFormReturn<TourFormData | TourEditData>;
    itineraryFields: any;
    factsFields: any;
    faqsFields: any;
    galleryFields: any;
    pricingOptionsFields: any;
    departuresFields: any;
    appendItinerary: (value: any) => void;
    removeItinerary: (index: number) => void;
    appendFact: (value: any) => void;
    removeFact: (index: number) => void;
    appendFaq: (value: any) => void;
    removeFaq: (index: number) => void;
    appendGallery: (value: any) => void;
    removeGallery: (index: number) => void;
    appendPricingOption: (value: any) => void;
    removePricingOption: (index: number) => void;
    appendDeparture: (value: any) => void;
    removeDeparture: (index: number) => void;
    resetForm: (data?: Partial<TourFormData>) => void;
}

/**
 * Custom hook for tour form management
 * Provides form instance, field arrays, and helper methods
 */
export function useTourForm({
    isEditing = false,
    defaultValues,
    onSubmit,
}: UseTourFormOptions = {}): UseTourFormReturn {
    // Get appropriate schema based on mode
    const schema = getTourFormSchema(isEditing);

    // Prepare default values with proper structure
    const formDefaultValues = getTourWithDefaults(defaultValues);

    // Initialize react-hook-form
    const form = useForm<TourFormData | TourEditData>({
        resolver: zodResolver(schema),
        defaultValues: formDefaultValues as any,
        mode: 'onChange',
    });

    // Set up field arrays for dynamic sections
    const itineraryFields = useFieldArray({
        control: form.control,
        name: 'itinerary.options.0' as any, // Support nested itinerary structure
    });

    const factsFields = useFieldArray({
        control: form.control,
        name: 'facts' as any,
    });

    const faqsFields = useFieldArray({
        control: form.control,
        name: 'faqs' as any,
    });

    const galleryFields = useFieldArray({
        control: form.control,
        name: 'gallery' as any,
    });

    const pricingOptionsFields = useFieldArray({
        control: form.control,
        name: 'pricing.pricingOptions' as any,
    });

    const departuresFields = useFieldArray({
        control: form.control,
        name: 'dates.departures' as any,
    });

    // Reset form when default values change (for edit mode)
    useEffect(() => {
        if (defaultValues && Object.keys(defaultValues).length > 0) {
            const updatedValues = getTourWithDefaults(defaultValues);
            form.reset(updatedValues as any);
        }
    }, [defaultValues, form]);

    // Helper method to reset form with new data
    const resetForm = (data?: Partial<TourFormData>) => {
        const resetValues = data ? getTourWithDefaults(data) : formDefaultValues;
        form.reset(resetValues as any);
    };

    // Handle form submission if onSubmit is provided
    const handleSubmit = form.handleSubmit(async (data) => {
        if (onSubmit) {
            await onSubmit(data);
        }
    });

    return {
        form,
        itineraryFields,
        factsFields,
        faqsFields,
        galleryFields,
        pricingOptionsFields,
        departuresFields,
        appendItinerary: itineraryFields.append,
        removeItinerary: itineraryFields.remove,
        appendFact: factsFields.append,
        removeFact: factsFields.remove,
        appendFaq: faqsFields.append,
        removeFaq: faqsFields.remove,
        appendGallery: galleryFields.append,
        removeGallery: galleryFields.remove,
        appendPricingOption: pricingOptionsFields.append,
        removePricingOption: pricingOptionsFields.remove,
        appendDeparture: departuresFields.append,
        removeDeparture: departuresFields.remove,
        resetForm,
    };
}
