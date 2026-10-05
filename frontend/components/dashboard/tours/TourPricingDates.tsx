'use client';

import React, { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { format } from 'date-fns';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTourContext } from '@/providers/TourProvider';
import { usePricingPresets, usePaxPresets, useDiscountPresets } from '@/lib/queries';
import { queryKeys } from '@/lib/queries/queryKeys';
import { apiErrorMessage } from '@/lib/api/apiClient';
import { createPaxPreset, createDiscountPreset, createPricingPreset, type PaxPreset, type DiscountPreset, type PricingOptionPreset, type PricingOption as PresetPricingOption } from '@/lib/api/tourSettingsApi';
import type { EditorDateRange, EditorPricingOption, PricingCategory, ScheduleType } from '@/types/tourEditor';
import type { RecurrencePattern } from '@/types/types';
import type { DateRange } from 'react-day-picker';
import {
    Calendar as CalendarIcon,
    Plus,
    Trash2,
    DollarSign,
    Percent,
    Users,
    X,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
    getDefaultPricingOption,
    getDefaultDeparture,
    calculateDaysNights,
} from '@/lib/utils/defaultTourValues';

/** API rows expose both `id` and `_id`. The selects key off `_id`. */
function presetIdOf(preset: { _id?: string; id?: string } | null | undefined): string {
    if (!preset) return '';
    return String(preset._id || preset.id || '');
}

function cacheCreatedPreset<T extends { _id?: string; id?: string }>(
    queryClient: QueryClient,
    queryKey: readonly unknown[],
    preset: T,
) {
    queryClient.setQueryData<T[]>(queryKey, (old) => {
        const list = Array.isArray(old) ? old : [];
        const id = presetIdOf(preset);
        if (!id || list.some((item) => presetIdOf(item) === id)) return list;
        return [preset, ...list];
    });
}

/** A pricing-options preset's option as an editor pricing option (presets keep the price as basePrice). */
function presetOptionToEditor(option: PresetPricingOption): EditorPricingOption {
    const discount = option.discount;
    return getDefaultPricingOption({
        name: option.name || '',
        category: option.category || 'adult',
        customCategory: option.customCategory || '',
        price: option.basePrice ?? 0,
        isActive: option.isActive ?? true,
        discount: {
            discountEnabled: !!option.discountEnabled,
            type: discount?.type || 'percentage',
            value: discount?.value || 0,
            dateRange: discount?.dateRange?.from && discount.dateRange.to
                ? { from: new Date(discount.dateRange.from), to: new Date(discount.dateRange.to) }
                : undefined,
        },
        paxRange: { min: option.paxRange?.min || 1, max: option.paxRange?.max || 22 },
    });
}

export function TourPricingDates() {
    const { setValue, watch, control, formState: { errors } } = useTourContext().form;
    const { user } = useAuth();

    // Watch pricing values
    const pricing = watch('pricing') || {};
    const price = pricing.price ?? '';
    const pricePerPerson = pricing.pricePerPerson ?? true;
    const minSize = pricing.minSize ?? '';
    const maxSize = pricing.maxSize ?? '';
    const pricingOptionsEnabled = pricing.pricingOptionsEnabled || false;
    const discountEnabled = pricing.discount?.discountEnabled || false;
    const paymentOptions = pricing.paymentOptions || { fullPaymentEnabled: true, depositEnabled: false, depositPercentage: 20, payOnArrivalEnabled: false };
    const noPaymentOptionEnabled = !paymentOptions.fullPaymentEnabled && !paymentOptions.depositEnabled && !paymentOptions.payOnArrivalEnabled;

    // Watch dates values
    const dates = watch('dates') || {};
    const scheduleType = dates.scheduleType || 'flexible';
    const days = dates.days || 0;
    const nights = dates.nights || 0;

    // Watch preset IDs
    const pricingPresetIds = watch('pricingPresetIds') || [];
    const paxPresetId = watch('paxPresetId');
    const discountPresetId = watch('discountPresetId');

    // Local state for tracking selected preset values (to ensure Select updates)
    const [localPaxPresetId, setLocalPaxPresetId] = useState<string | undefined>(paxPresetId);
    const [localDiscountPresetId, setLocalDiscountPresetId] = useState<string | undefined>(discountPresetId);
    // Presets created from the inline dialog, shown before the presets query refreshes.
    const [extraPaxPresets, setExtraPaxPresets] = useState<PaxPreset[]>([]);
    const [extraDiscountPresets, setExtraDiscountPresets] = useState<DiscountPreset[]>([]);
    const [extraPricingPresets, setExtraPricingPresets] = useState<PricingOptionPreset[]>([]);
    // While set, ignore Select onValueChange. The hidden native <select> Radix
    // renders for form controls snaps to "Custom" (or a previous option) when the
    // new id is not registered yet, which was clearing the selection and applying
    // the wrong min/max.
    const paxSelectGuard = React.useRef<string | null>(null);
    const discountSelectGuard = React.useRef<string | null>(null);

    // Sync local state with form state, but never clobber a selection we just made.
    React.useEffect(() => {
        if (paxSelectGuard.current) return;
        setLocalPaxPresetId(paxPresetId ? String(paxPresetId) : undefined);
    }, [paxPresetId]);

    React.useEffect(() => {
        if (discountSelectGuard.current) return;
        setLocalDiscountPresetId(discountPresetId ? String(discountPresetId) : undefined);
    }, [discountPresetId]);

    // Local state for pricing preset selector (multi-select)
    const [pricingPresetSelectorValue, setPricingPresetSelectorValue] = useState<string>('');

    const { data: pricingPresets = [], isLoading: isLoadingPricingPresets } = usePricingPresets(user?.id ?? undefined, !!user?.id);
    const { data: paxPresets = [], isLoading: isLoadingPaxPresets } = usePaxPresets(user?.id ?? undefined, !!user?.id);
    const { data: discountPresets = [], isLoading: isLoadingDiscountPresets } = useDiscountPresets(user?.id ?? undefined, !!user?.id);

    const paxPresetOptions = React.useMemo(() => {
        const extras = extraPaxPresets.filter((preset) => !paxPresets.some((item) => presetIdOf(item) === presetIdOf(preset)));
        return [...extras, ...paxPresets].filter((preset) => presetIdOf(preset));
    }, [extraPaxPresets, paxPresets]);
    const discountPresetOptions = React.useMemo(() => {
        const extras = extraDiscountPresets.filter((preset) => !discountPresets.some((item) => presetIdOf(item) === presetIdOf(preset)));
        return [...extras, ...discountPresets].filter((preset) => presetIdOf(preset));
    }, [extraDiscountPresets, discountPresets]);
    const pricingPresetOptions = React.useMemo(() => {
        const extras = extraPricingPresets.filter((preset) => !pricingPresets.some((item) => presetIdOf(item) === presetIdOf(preset)));
        return [...extras, ...pricingPresets].filter((preset) => presetIdOf(preset));
    }, [extraPricingPresets, pricingPresets]);

    React.useEffect(() => {
        if (!paxSelectGuard.current) return;
        if (!paxPresetOptions.some((preset) => presetIdOf(preset) === paxSelectGuard.current)) return;
        let cancelled = false;
        const frame = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!cancelled) paxSelectGuard.current = null;
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [paxPresetOptions]);

    React.useEffect(() => {
        if (!discountSelectGuard.current) return;
        if (!discountPresetOptions.some((preset) => presetIdOf(preset) === discountSelectGuard.current)) return;
        let cancelled = false;
        const frame = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!cancelled) discountSelectGuard.current = null;
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [discountPresetOptions]);

    // Inline "create preset" dialog visibility — lets the seller add a
    // preset without leaving the add/edit tour page.
    const [showCreatePaxDialog, setShowCreatePaxDialog] = useState(false);
    const [showCreateDiscountDialog, setShowCreateDiscountDialog] = useState(false);
    const [showCreatePricingDialog, setShowCreatePricingDialog] = useState(false);

    // Field arrays for dynamic sections
    const { fields: pricingOptions, append: appendPricingOption, remove: removePricingOption } = useFieldArray({
        control,
        name: 'pricing.pricingOptions',
    });

    const { fields: departures, append: appendDeparture, remove: removeDeparture } = useFieldArray({
        control,
        name: 'dates.departures',
    });

    // Get selected preset data for display
    const selectedDiscountPreset = discountPresetOptions.find(p => presetIdOf(p) === String(localDiscountPresetId || discountPresetId || ''));

    return (
        <div className="space-y-8">
            {/* Pricing Model & Base Price Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Pricing Configuration</CardTitle>
                    <CardDescription>
                        Configure how this tour is priced
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 1. Pricing Model - Per Person or Per Group */}
                    <div className="space-y-4">
                        <div>
                            <Label className="text-base font-semibold">Pricing Model</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                How is this tour priced?
                            </p>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Price Per Person</Label>
                                <p className="text-sm text-muted-foreground">
                                    {pricePerPerson ? 'Price is calculated per person' : 'Price is for the entire group'}
                                </p>
                            </div>
                            <Switch
                                checked={pricePerPerson}
                                onCheckedChange={(checked) => setValue('pricing.pricePerPerson', checked)}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* 2. Base Price */}
                    <div className="space-y-2">
                        <Label htmlFor="pricing.price" className="text-base font-semibold">
                            Base Price <span className="text-destructive">*</span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            What is the base price?
                        </p>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="pricing.price"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="pl-10"
                                value={price}
                                onChange={(e) => setValue('pricing.price', e.target.valueAsNumber || 0)}
                                onBlur={(e) => setValue('pricing.price', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        {errors.pricing &&
                            typeof errors.pricing === 'object' &&
                            'price' in errors.pricing &&
                            errors.pricing.price && (
                                <p className="text-sm text-destructive">
                                    {String(
                                        (errors.pricing as { price?: { message?: string } }).price?.message || 'Invalid price'
                                    )}
                                </p>
                            )}
                    </div>

                    <Separator />

                    {/* 3. Price Lock Date */}
                    <div className="space-y-2">
                        <Label htmlFor="pricing.priceLockDate" className="text-base font-semibold">
                            Price Lock Until (Optional)
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Hide this tour after this date
                        </p>
                        <PriceLockDatePicker />
                    </div>

                    <Separator />

                    {/* 4. Group Size with Preset Integration */}
                    <div className="space-y-4">
                        <div>
                            <Label className="text-base font-semibold">Group Size</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Participant limits for this tour
                            </p>
                        </div>

                        {/* Group Size Preset Selector */}
                        <div className="space-y-2">
                            <Label>Use Preset</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={localPaxPresetId ? String(localPaxPresetId) : 'custom'}
                                    onValueChange={(value) => {
                                        if (paxSelectGuard.current && value !== paxSelectGuard.current) return;
                                        if (value === 'custom') {
                                            setLocalPaxPresetId(undefined);
                                            setValue('paxPresetId', undefined, { shouldDirty: true, shouldValidate: false });
                                        } else if (value !== 'loading' && value !== 'none') {
                                            const presetId = value;
                                            setLocalPaxPresetId(presetId);
                                            setValue('paxPresetId', presetId, { shouldDirty: true, shouldValidate: false });
                                            const preset = paxPresetOptions.find(p => presetIdOf(p) === String(presetId));
                                            if (preset) {
                                                setValue('pricing.minSize', preset.minSize, { shouldDirty: true });
                                                setValue('pricing.maxSize', preset.maxSize, { shouldDirty: true });
                                                setValue('pricing.pricePerPerson', preset.pricePerPerson, { shouldDirty: true });
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select a preset or use custom" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem value="custom">Custom</SelectItem>
                                        {isLoadingPaxPresets && paxPresetOptions.length === 0 ? (
                                            <SelectItem value="loading" disabled>Loading presets...</SelectItem>
                                        ) : paxPresetOptions.length > 0 ? (
                                            paxPresetOptions.map((preset) => (
                                                <SelectItem
                                                    key={presetIdOf(preset)}
                                                    value={presetIdOf(preset)}
                                                >
                                                    {preset.name} ({preset.minSize}-{preset.maxSize} {preset.pricePerPerson ? 'per person' : 'per group'})
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                No presets yet — use the button below to create one
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowCreatePaxDialog(true)}
                                    title="Create a new group size preset"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                                <CreatePaxPresetDialog
                                    open={showCreatePaxDialog}
                                    onOpenChange={setShowCreatePaxDialog}
                                    onCreated={(preset) => {
                                        const id = presetIdOf(preset);
                                        if (!id) return;
                                        paxSelectGuard.current = id;
                                        setExtraPaxPresets((current) => current.some((item) => presetIdOf(item) === id) ? current : [preset, ...current]);
                                        setLocalPaxPresetId(id);
                                        setValue('paxPresetId', id, { shouldDirty: true, shouldValidate: false });
                                        setValue('pricing.minSize', preset.minSize, { shouldDirty: true });
                                        setValue('pricing.maxSize', preset.maxSize, { shouldDirty: true });
                                        setValue('pricing.pricePerPerson', preset.pricePerPerson, { shouldDirty: true });
                                    }}
                                />
                                {localPaxPresetId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setLocalPaxPresetId(undefined);
                                            setValue('paxPresetId', undefined);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Group Size Inputs - Show when custom or preset selected (editable) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="pricing.minSize" className="text-sm">
                                    Minimum Size
                                </Label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="pricing.minSize"
                                        type="number"
                                        min="1"
                                        className="pl-10"
                                        value={minSize}
                                        onChange={(e) => setValue('pricing.minSize', e.target.valueAsNumber || 0)}
                                        onBlur={(e) => setValue('pricing.minSize', parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pricing.maxSize" className="text-sm">
                                    Maximum Size
                                </Label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="pricing.maxSize"
                                        type="number"
                                        min="1"
                                        className="pl-10"
                                        value={maxSize}
                                        onChange={(e) => setValue('pricing.maxSize', e.target.valueAsNumber || 0)}
                                        onBlur={(e) => setValue('pricing.maxSize', parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* Discount Section with Preset Integration */}
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Discount</CardTitle>
                        <CardDescription>
                            Are there any discounts?
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Discount Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Enable Discount</Label>
                            <p className="text-sm text-muted-foreground">
                                Offer a discount for this tour
                            </p>
                        </div>
                        <Switch
                            checked={discountEnabled}
                            onCheckedChange={(checked) => {
                                setValue('pricing.discount.discountEnabled', checked);
                                if (!checked) {
                                    setValue('discountPresetId', undefined);
                                }
                            }}
                        />
                    </div>

                    {/* Discount Configuration - Show when enabled */}
                    {discountEnabled && (
                        <div className="space-y-6 p-4 border rounded-lg bg-muted/30">
                            {/* Discount Preset Selector */}
                            <div className="space-y-2">
                                <Label>Use Discount Preset</Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={localDiscountPresetId ? String(localDiscountPresetId) : 'custom'}
                                        onValueChange={(value) => {
                                            if (discountSelectGuard.current && value !== discountSelectGuard.current) return;
                                            if (value === 'custom') {
                                                setLocalDiscountPresetId(undefined);
                                                setValue('discountPresetId', undefined, { shouldDirty: true, shouldValidate: false });
                                                // Reset to default values
                                                setValue('pricing.discount.type', 'percentage', { shouldDirty: true });
                                                setValue('pricing.discount.value', 0, { shouldDirty: true });
                                                setValue('pricing.discount.dateRange', undefined, { shouldDirty: true });
                                            } else if (value !== 'loading' && value !== 'none') {
                                                const presetId = value;
                                                setLocalDiscountPresetId(presetId);
                                                setValue('discountPresetId', presetId, { shouldDirty: true, shouldValidate: false });
                                                const preset = discountPresetOptions.find(p => presetIdOf(p) === String(presetId));
                                                if (preset) {
                                                    setValue('pricing.discount.type', preset.type, { shouldDirty: true });
                                                    setValue('pricing.discount.value', preset.value, { shouldDirty: true });
                                                    if (preset.dateRange) {
                                                        setValue('pricing.discount.dateRange', {
                                                            from: new Date(preset.dateRange.from),
                                                            to: new Date(preset.dateRange.to)
                                                        }, { shouldDirty: true });
                                                    } else {
                                                        setValue('pricing.discount.dateRange', undefined, { shouldDirty: true });
                                                    }
                                                }
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a preset or create custom" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="custom">Custom Discount</SelectItem>
                                            {isLoadingDiscountPresets && discountPresetOptions.length === 0 ? (
                                                <SelectItem value="loading" disabled>Loading presets...</SelectItem>
                                            ) : discountPresetOptions.length > 0 ? (
                                                discountPresetOptions.map((preset) => (
                                                    <SelectItem
                                                        key={presetIdOf(preset)}
                                                        value={presetIdOf(preset)}
                                                    >
                                                        {preset.name} ({preset.type === 'percentage' ? `${preset.value}%` : `$${preset.value}`})
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>
                                                    No presets yet — use the button below to create one
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setShowCreateDiscountDialog(true)}
                                        title="Create a new discount preset"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                    <CreateDiscountPresetDialog
                                        open={showCreateDiscountDialog}
                                        onOpenChange={setShowCreateDiscountDialog}
                                        onCreated={(preset) => {
                                            const id = presetIdOf(preset);
                                            if (!id) return;
                                            discountSelectGuard.current = id;
                                            setExtraDiscountPresets((current) => current.some((item) => presetIdOf(item) === id) ? current : [preset, ...current]);
                                            setLocalDiscountPresetId(id);
                                            setValue('discountPresetId', id, { shouldDirty: true, shouldValidate: false });
                                            setValue('pricing.discount.type', preset.type, { shouldDirty: true });
                                            setValue('pricing.discount.value', preset.value, { shouldDirty: true });
                                            if (preset.dateRange) {
                                                setValue('pricing.discount.dateRange', {
                                                    from: new Date(preset.dateRange.from),
                                                    to: new Date(preset.dateRange.to),
                                                }, { shouldDirty: true });
                                            }
                                        }}
                                    />
                                    {localDiscountPresetId && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setLocalDiscountPresetId(undefined);
                                                setValue('discountPresetId', undefined);
                                                setValue('pricing.discount.type', 'percentage');
                                                setValue('pricing.discount.value', 0);
                                                setValue('pricing.discount.dateRange', undefined);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                {localDiscountPresetId && selectedDiscountPreset && (
                                    <div className="flex items-center gap-2 p-2 bg-background rounded border">
                                        <Badge variant="secondary">
                                            {selectedDiscountPreset.name} ({selectedDiscountPreset.type === 'percentage' ? `${selectedDiscountPreset.value}%` : `$${selectedDiscountPreset.value}`})
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            {/* Discount Type */}
                            <div className="space-y-2">
                                <Label>Discount Type</Label>
                                <RadioGroup
                                    value={pricing.discount?.type || 'percentage'}
                                    onValueChange={(value) => setValue('pricing.discount.type', value === 'price' ? 'price' : 'percentage')}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="percentage" id="percentage" />
                                        <Label htmlFor="percentage" className="font-normal cursor-pointer">
                                            Percentage Discount
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="price" id="price" />
                                        <Label htmlFor="price" className="font-normal cursor-pointer">
                                            Fixed Amount Discount
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Discount Value */}
                            <div className="space-y-2">
                                <Label htmlFor="pricing.discount.value">
                                    {pricing.discount?.type === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                                </Label>
                                <div className="relative">
                                    {pricing.discount?.type === 'percentage' ? (
                                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    )}
                                    <Input
                                        id="pricing.discount.value"
                                        type="number"
                                        min="0"
                                        max={pricing.discount?.type === 'percentage' ? 100 : undefined}
                                        step={pricing.discount?.type === 'percentage' ? '1' : '0.01'}
                                        placeholder={pricing.discount?.type === 'percentage' ? '0' : '0.00'}
                                        className="pl-10"
                                        value={pricing.discount?.value || 0}
                                        onChange={(e) => setValue('pricing.discount.value', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                {pricing.discount?.type === 'percentage' && (
                                    <p className="text-xs text-muted-foreground">
                                        Enter a value between 0 and 100
                                    </p>
                                )}
                            </div>

                            {/* Discount Date Range */}
                            <DiscountDateRange />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Advanced Pricing Options with Preset Integration */}
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Advanced Pricing Options</CardTitle>
                        <CardDescription>
                            Do I need multiple pricing tiers (adult/child/etc)?
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Pricing Options Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Enable Advanced Pricing</Label>
                            <p className="text-sm text-muted-foreground">
                                Create multiple pricing tiers (Adult, Child, Senior, etc.)
                            </p>
                        </div>
                        <Switch
                            checked={pricingOptionsEnabled}
                            onCheckedChange={(checked) => {
                                setValue('pricing.pricingOptionsEnabled', checked);
                                if (!checked) {
                                    setValue('pricingPresetIds', []);
                                }
                            }}
                        />
                    </div>

                    {/* Pricing Options Configuration - Show when enabled */}
                    {pricingOptionsEnabled && (
                        <div className="space-y-6 p-4 border rounded-lg bg-muted/30">
                            {/* Pricing Options Preset Selector - Multiple Selection */}
                            <div className="space-y-2">
                                <Label>Add Pricing Options Preset</Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={pricingPresetSelectorValue || 'add-preset'}
                                        onValueChange={(value) => {
                                            if (value && value !== 'add-preset' && value !== 'custom' && value !== 'none' && value !== 'loading') {
                                                const currentIds = Array.isArray(pricingPresetIds) ? pricingPresetIds : [];
                                                const presetId = value;
                                                // Check if preset ID is already in the array (compare as strings)
                                                if (!currentIds.some(id => String(id) === String(presetId))) {
                                                    setValue('pricingPresetIds', [...currentIds, presetId]);

                                                    // Apply preset options to the form
                                                    const selectedPreset = pricingPresetOptions.find(p => presetIdOf(p) === String(presetId));
                                                    if (selectedPreset && selectedPreset.options && Array.isArray(selectedPreset.options)) {
                                                        // Add each option from the preset to the form
                                                        selectedPreset.options.forEach((presetOption) => {
                                                            const formOption = presetOptionToEditor(presetOption);
                                                            appendPricingOption(formOption);
                                                        });
                                                    }
                                                }
                                                // Reset selector after selection
                                                setPricingPresetSelectorValue('');
                                            } else {
                                                setPricingPresetSelectorValue('');
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a preset to add" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            {isLoadingPricingPresets && pricingPresetOptions.length === 0 ? (
                                                <SelectItem value="loading" disabled>Loading presets...</SelectItem>
                                            ) : pricingPresetOptions.length > 0 ? (
                                                pricingPresetOptions
                                                    .filter(preset => !(Array.isArray(pricingPresetIds) && pricingPresetIds.some(id => String(id) === presetIdOf(preset))))
                                                    .map((preset) => (
                                                        <SelectItem
                                                            key={presetIdOf(preset)}
                                                            value={presetIdOf(preset)}
                                                        >
                                                            {preset.name}
                                                        </SelectItem>
                                                    ))
                                            ) : (
                                                <SelectItem value="none" disabled>
                                                    No presets yet — use the button below to create one
                                                </SelectItem>
                                            )}
                                            {pricingPresetOptions.length > 0 &&
                                                Array.isArray(pricingPresetIds) &&
                                                pricingPresetIds.length === pricingPresetOptions.length && (
                                                    <SelectItem value="none" disabled>
                                                        All presets selected
                                                    </SelectItem>
                                                )}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setShowCreatePricingDialog(true)}
                                        title="Create a new pricing options preset"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                    <CreatePricingPresetDialog
                                        open={showCreatePricingDialog}
                                        onOpenChange={setShowCreatePricingDialog}
                                        onCreated={(preset) => {
                                            const id = presetIdOf(preset);
                                            if (!id) return;
                                            setExtraPricingPresets((current) => current.some((item) => presetIdOf(item) === id) ? current : [preset, ...current]);
                                            const currentIds = Array.isArray(pricingPresetIds) ? pricingPresetIds : [];
                                            if (!currentIds.some((existing) => String(existing) === id)) {
                                                setValue('pricingPresetIds', [...currentIds, id]);
                                            }
                                            (preset.options || []).forEach((presetOption) => {
                                                appendPricingOption(presetOptionToEditor(presetOption));
                                            });
                                        }}
                                    />
                                </div>

                                {/* Show selected presets */}
                                {Array.isArray(pricingPresetIds) && pricingPresetIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {pricingPresetIds.map((presetId) => {
                                            const preset = pricingPresetOptions.find(p => presetIdOf(p) === String(presetId));
                                            if (!preset) return null;
                                            return (
                                                <Badge key={presetId} variant="secondary" className="flex items-center gap-1">
                                                    {preset.name}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                                        onClick={() => {
                                                            const currentIds = Array.isArray(pricingPresetIds) ? pricingPresetIds : [];
                                                            setValue('pricingPresetIds', currentIds.filter(id => id !== presetId));
                                                        }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Custom Pricing Options */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Custom Pricing Options</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => appendPricingOption(getDefaultPricingOption())}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Pricing Option
                                    </Button>
                                </div>

                                {pricingOptions.length > 0 ? (
                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                        {pricingOptions.map((field, index) => (
                                            <AccordionItem key={field.id} value={`option-${index}`} className="border rounded-lg">
                                                <PricingOptionItem
                                                    index={index}
                                                    onRemove={() => removePricingOption(index)}
                                                />
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                ) : null}

                                {pricingOptions.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No custom pricing options added yet. Add one or select a preset above.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment Options */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Options</CardTitle>
                    <CardDescription>
                        Choose which payment policies travelers can pick from when booking this tour
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Full Payment</Label>
                            <p className="text-sm text-muted-foreground">Traveler pays the full amount at booking</p>
                        </div>
                        <Switch
                            checked={paymentOptions.fullPaymentEnabled}
                            onCheckedChange={(checked) => setValue('pricing.paymentOptions.fullPaymentEnabled', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Deposit</Label>
                            <p className="text-sm text-muted-foreground">Traveler pays a percentage now, the rest later</p>
                        </div>
                        <Switch
                            checked={paymentOptions.depositEnabled}
                            onCheckedChange={(checked) => setValue('pricing.paymentOptions.depositEnabled', checked)}
                        />
                    </div>
                    {paymentOptions.depositEnabled && (
                        <div className="space-y-2 pl-4 border-l-2 border-border">
                            <Label htmlFor="pricing.paymentOptions.depositPercentage">Deposit Percentage</Label>
                            <div className="relative max-w-[160px]">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="pricing.paymentOptions.depositPercentage"
                                    type="number"
                                    min="1"
                                    max="99"
                                    step="1"
                                    className="pl-10"
                                    value={paymentOptions.depositPercentage}
                                    onChange={(e) => setValue('pricing.paymentOptions.depositPercentage', Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Pay on Arrival</Label>
                            <p className="text-sm text-muted-foreground">Traveler pays nothing now — full amount due in person</p>
                        </div>
                        <Switch
                            checked={paymentOptions.payOnArrivalEnabled}
                            onCheckedChange={(checked) => setValue('pricing.paymentOptions.payOnArrivalEnabled', checked)}
                        />
                    </div>

                    {noPaymentOptionEnabled && (
                        <p className="text-sm text-destructive">At least one payment option must be enabled, or this tour can&apos;t be booked.</p>
                    )}
                </CardContent>
            </Card>

            {/* Schedule Type */}
            <Card>
                <CardHeader>
                    <CardTitle>Tour Schedule</CardTitle>
                    <CardDescription>
                        Configure when this tour is available
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Schedule Type Selector */}
                    <div className="space-y-2">
                        <Label>Schedule Type</Label>
                        <RadioGroup
                            value={scheduleType}
                            onValueChange={(value) => setValue('dates.scheduleType', value as ScheduleType)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="flexible" id="flexible" />
                                <Label htmlFor="flexible" className="font-normal cursor-pointer">
                                    Flexible - Available anytime (specify duration only)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="fixed" id="fixed" />
                                <Label htmlFor="fixed" className="font-normal cursor-pointer">
                                    Fixed - Single date range
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="multiple" id="multiple" />
                                <Label htmlFor="multiple" className="font-normal cursor-pointer">
                                    Multiple Departures - Specific departure dates
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <Separator />

                    {/* Flexible Schedule */}
                    {scheduleType === 'flexible' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dates.days">Days</Label>
                                    <Input
                                        id="dates.days"
                                        type="number"
                                        min="0"
                                        value={days}
                                        onChange={(e) => setValue('dates.days', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dates.nights">Nights</Label>
                                    <Input
                                        id="dates.nights"
                                        type="number"
                                        min="0"
                                        value={nights}
                                        onChange={(e) => setValue('dates.nights', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fixed Date Range */}
                    {scheduleType === 'fixed' && (
                        <FixedDateRange />
                    )}

                    {/* Multiple Departures */}
                    {scheduleType === 'multiple' && (
                        <div className="space-y-4">
                            {departures.map((field, index) => (
                                <DepartureItem
                                    key={field.id}
                                    index={index}
                                    onRemove={() => removeDeparture(index)}
                                />
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => appendDeparture(getDefaultDeparture())}
                                className="w-full"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Departure
                            </Button>
                        </div>
                    )}

                    <Separator />

                    {/* Pricing Category Selection */}
                    {pricingOptionsEnabled && pricingOptions.length > 0 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Pricing Category</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose which pricing options apply to this tour schedule
                                </p>
                                <div className="space-y-2">
                                    {pricingOptions.map((field, index) => {
                                        const option = watch(`pricing.pricingOptions.${index}`) || {};
                                        const optionId = option.id || `option-${index}`;
                                        const pricingCategory = dates.pricingCategory || [];
                                        const isSelected = Array.isArray(pricingCategory) && pricingCategory.includes(optionId);

                                        return (
                                            <div key={field.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`pricing-category-${index}`}
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        const currentCategory = Array.isArray(pricingCategory) ? pricingCategory : [];
                                                        if (e.target.checked) {
                                                            setValue('dates.pricingCategory', [...currentCategory, optionId]);
                                                        } else {
                                                            setValue('dates.pricingCategory', currentCategory.filter(id => id !== optionId));
                                                        }
                                                    }}
                                                    className="h-4 w-4 rounded border-gray-300"
                                                />
                                                <Label htmlFor={`pricing-category-${index}`} className="font-normal cursor-pointer">
                                                    {option.name || `Pricing Option ${index + 1}`} - ${option.price || 0}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Tour Recurrence */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Tour Recurrence</Label>
                                <p className="text-sm text-muted-foreground">
                                    Enable recurring schedule for this tour
                                </p>
                            </div>
                            <Switch
                                checked={dates.isRecurring || false}
                                onCheckedChange={(checked) => {
                                    setValue('dates.isRecurring', checked);
                                    if (!checked) {
                                        setValue('dates.recurrencePattern', undefined);
                                        setValue('dates.recurrenceInterval', undefined);
                                        setValue('dates.recurrenceEndDate', undefined);
                                    }
                                }}
                            />
                        </div>

                        {dates.isRecurring && (
                            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                {/* Recurrence Pattern */}
                                <div className="space-y-2">
                                    <Label>Recurrence Pattern</Label>
                                    <Select
                                        value={dates.recurrencePattern || 'daily'}
                                        onValueChange={(value) => setValue('dates.recurrencePattern', value as RecurrencePattern)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="quarterly">Quarterly</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Recurrence Interval */}
                                <div className="space-y-2">
                                    <Label htmlFor="dates.recurrenceInterval">Interval</Label>
                                    <Input
                                        id="dates.recurrenceInterval"
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        value={dates.recurrenceInterval || 1}
                                        onChange={(e) => setValue('dates.recurrenceInterval', parseInt(e.target.value) || 1)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Repeat every N {dates.recurrencePattern || 'days'}
                                    </p>
                                </div>

                                {/* Recurrence End Date */}
                                <div className="space-y-2">
                                    <Label>Recurrence End Date (Optional)</Label>
                                    <RecurrenceEndDatePicker />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Pricing Option Item Component
 * Individual pricing option with category, price, and discount
 */
interface PricingOptionItemProps {
    index: number;
    onRemove: () => void;
}

function PricingOptionItem({ index, onRemove }: PricingOptionItemProps) {
    const { register, setValue, watch } = useTourContext().form;
    const { user } = useAuth();
    const option = watch(`pricing.pricingOptions.${index}`) || {};
    const discountEnabled = option.discount?.discountEnabled || false;
    const paxRange = option.paxRange || { min: 1, max: 22 };

    const { data: discountPresets = [], isLoading: isLoadingDiscountPresets } = useDiscountPresets(user?.id ?? undefined, !!user?.id);

    // Local state for discount preset selection
    const [localDiscountPresetId, setLocalDiscountPresetId] = useState<string | undefined>(undefined);
    const [extraDiscountPresets, setExtraDiscountPresets] = useState<DiscountPreset[]>([]);
    const [showCreateDiscountDialog, setShowCreateDiscountDialog] = useState(false);
    const discountSelectGuard = React.useRef<string | null>(null);

    const discountPresetOptions = React.useMemo(() => {
        const extras = extraDiscountPresets.filter((preset) => !discountPresets.some((item) => presetIdOf(item) === presetIdOf(preset)));
        return [...extras, ...discountPresets].filter((preset) => presetIdOf(preset));
    }, [extraDiscountPresets, discountPresets]);

    React.useEffect(() => {
        if (!discountSelectGuard.current) return;
        if (!discountPresetOptions.some((preset) => presetIdOf(preset) === discountSelectGuard.current)) return;
        let cancelled = false;
        const frame = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!cancelled) discountSelectGuard.current = null;
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [discountPresetOptions]);

    // Get selected discount preset
    const selectedDiscountPreset = discountPresetOptions.find(p => presetIdOf(p) === String(localDiscountPresetId || ''));

    return (
        <>
            <div className="flex items-center justify-between px-4 py-2">
                <AccordionTrigger className="hover:no-underline flex-1 text-left py-0">
                    <h4 className="font-semibold">Pricing Option {index + 1}: {option.name || 'Unnamed'}</h4>
                </AccordionTrigger>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="ml-2 shrink-0"
                >
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
            <AccordionContent className="px-4 pb-4 space-y-4">

                {/* Name */}
                <div className="space-y-2">
                    <Label htmlFor={`pricing.pricingOptions.${index}.name`}>
                        Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id={`pricing.pricingOptions.${index}.name`}
                        placeholder="e.g., Adult, Child, Senior"
                        {...register(`pricing.pricingOptions.${index}.name`)}
                    />
                </div>

                {/* Category */}
                <div className="space-y-2">
                    <Label htmlFor={`pricing.pricingOptions.${index}.category`}>
                        Category
                    </Label>
                    <Select
                        value={option.category || 'adult'}
                        onValueChange={(value) => setValue(`pricing.pricingOptions.${index}.category`, value as PricingCategory)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="adult">Adult</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Custom Category */}
                {option.category === 'custom' && (
                    <div className="space-y-2">
                        <Label htmlFor={`pricing.pricingOptions.${index}.customCategory`}>
                            Custom Category Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id={`pricing.pricingOptions.${index}.customCategory`}
                            placeholder="e.g., Student, Senior Citizen"
                            {...register(`pricing.pricingOptions.${index}.customCategory`)}
                        />
                    </div>
                )}

                {/* Price */}
                <div className="space-y-2">
                    <Label htmlFor={`pricing.pricingOptions.${index}.price`}>
                        Price <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id={`pricing.pricingOptions.${index}.price`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-10"
                            {...register(`pricing.pricingOptions.${index}.price`, { valueAsNumber: true })}
                        />
                    </div>
                </div>

                {/* Pax Range */}
                <div className="space-y-2">
                    <Label>Participant Range</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor={`pricing.pricingOptions.${index}.paxRange.min`} className="text-sm">
                                Minimum
                            </Label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id={`pricing.pricingOptions.${index}.paxRange.min`}
                                    type="number"
                                    min="1"
                                    className="pl-10"
                                    value={paxRange.min || 1}
                                    onChange={(e) => setValue(`pricing.pricingOptions.${index}.paxRange.min`, parseInt(e.target.value) || 1)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`pricing.pricingOptions.${index}.paxRange.max`} className="text-sm">
                                Maximum
                            </Label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id={`pricing.pricingOptions.${index}.paxRange.max`}
                                    type="number"
                                    min="1"
                                    className="pl-10"
                                    value={paxRange.max || 22}
                                    onChange={(e) => setValue(`pricing.pricingOptions.${index}.paxRange.max`, parseInt(e.target.value) || 22)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Discount Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Enable Discount</Label>
                        <p className="text-sm text-muted-foreground">
                            Apply discount to this pricing option
                        </p>
                    </div>
                    <Switch
                        checked={discountEnabled}
                        onCheckedChange={(checked) => setValue(`pricing.pricingOptions.${index}.discount.discountEnabled`, checked)}
                    />
                </div>

                {/* Discount Configuration */}
                {discountEnabled && (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        {/* Discount Preset Selector */}
                        <div className="space-y-2">
                            <Label>Use Discount Preset (Optional)</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={localDiscountPresetId ? String(localDiscountPresetId) : 'custom'}
                                    onValueChange={(value) => {
                                        if (discountSelectGuard.current && value !== discountSelectGuard.current) return;
                                        if (value === 'custom') {
                                            setLocalDiscountPresetId(undefined);
                                            // Reset to default values
                                            setValue(`pricing.pricingOptions.${index}.discount.type`, 'percentage');
                                            setValue(`pricing.pricingOptions.${index}.discount.value`, 0);
                                            setValue(`pricing.pricingOptions.${index}.discount.dateRange`, undefined);
                                        } else if (value !== 'loading' && value !== 'none') {
                                            const presetId = value;
                                            setLocalDiscountPresetId(presetId);
                                            const preset = discountPresetOptions.find(p => presetIdOf(p) === String(presetId));
                                            if (preset) {
                                                setValue(`pricing.pricingOptions.${index}.discount.type`, preset.type);
                                                setValue(`pricing.pricingOptions.${index}.discount.value`, preset.value);
                                                if (preset.dateRange) {
                                                    setValue(`pricing.pricingOptions.${index}.discount.dateRange`, {
                                                        from: new Date(preset.dateRange.from),
                                                        to: new Date(preset.dateRange.to)
                                                    });
                                                } else {
                                                    setValue(`pricing.pricingOptions.${index}.discount.dateRange`, undefined);
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select a preset or create custom" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem value="custom">Custom Discount</SelectItem>
                                        {isLoadingDiscountPresets && discountPresetOptions.length === 0 ? (
                                            <SelectItem value="loading" disabled>Loading presets...</SelectItem>
                                        ) : discountPresetOptions.length > 0 ? (
                                            discountPresetOptions.map((preset) => (
                                                <SelectItem
                                                    key={presetIdOf(preset)}
                                                    value={presetIdOf(preset)}
                                                >
                                                    {preset.name} ({preset.type === 'percentage' ? `${preset.value}%` : `$${preset.value}`})
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                No presets yet — use the button below to create one
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowCreateDiscountDialog(true)}
                                    title="Create a new discount preset"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                                <CreateDiscountPresetDialog
                                    open={showCreateDiscountDialog}
                                    onOpenChange={setShowCreateDiscountDialog}
                                    onCreated={(preset) => {
                                        const id = presetIdOf(preset);
                                        if (!id) return;
                                        discountSelectGuard.current = id;
                                        setExtraDiscountPresets((current) => current.some((item) => presetIdOf(item) === id) ? current : [preset, ...current]);
                                        setLocalDiscountPresetId(id);
                                        setValue(`pricing.pricingOptions.${index}.discount.type`, preset.type);
                                        setValue(`pricing.pricingOptions.${index}.discount.value`, preset.value);
                                        if (preset.dateRange) {
                                            setValue(`pricing.pricingOptions.${index}.discount.dateRange`, {
                                                from: new Date(preset.dateRange.from),
                                                to: new Date(preset.dateRange.to),
                                            });
                                        }
                                    }}
                                />
                                {localDiscountPresetId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setLocalDiscountPresetId(undefined);
                                            setValue(`pricing.pricingOptions.${index}.discount.type`, 'percentage');
                                            setValue(`pricing.pricingOptions.${index}.discount.value`, 0);
                                            setValue(`pricing.pricingOptions.${index}.discount.dateRange`, undefined);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {localDiscountPresetId && selectedDiscountPreset && (
                                <div className="flex items-center gap-2 p-2 bg-background rounded border">
                                    <Badge variant="secondary">
                                        {selectedDiscountPreset.name} ({selectedDiscountPreset.type === 'percentage' ? `${selectedDiscountPreset.value}%` : `$${selectedDiscountPreset.value}`})
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Discount Type */}
                        <div className="space-y-2">
                            <Label>Discount Type</Label>
                            <RadioGroup
                                value={option.discount?.type || 'percentage'}
                                onValueChange={(value) => setValue(`pricing.pricingOptions.${index}.discount.type`, value === 'price' ? 'price' : 'percentage')}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="percentage" id={`option-${index}-percentage`} />
                                    <Label htmlFor={`option-${index}-percentage`} className="font-normal cursor-pointer">
                                        Percentage
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="price" id={`option-${index}-price`} />
                                    <Label htmlFor={`option-${index}-price`} className="font-normal cursor-pointer">
                                        Fixed Amount
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Discount Value */}
                        <div className="space-y-2">
                            <Label htmlFor={`pricing.pricingOptions.${index}.discount.value`}>
                                {option.discount?.type === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                            </Label>
                            <div className="relative">
                                {option.discount?.type === 'percentage' ? (
                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                )}
                                <Input
                                    id={`pricing.pricingOptions.${index}.discount.value`}
                                    type="number"
                                    min="0"
                                    max={option.discount?.type === 'percentage' ? 100 : undefined}
                                    step={option.discount?.type === 'percentage' ? '1' : '0.01'}
                                    placeholder={option.discount?.type === 'percentage' ? '0' : '0.00'}
                                    className="pl-10"
                                    value={option.discount?.value || 0}
                                    onChange={(e) => setValue(`pricing.pricingOptions.${index}.discount.value`, parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        {/* Discount Date Range */}
                        <PricingOptionDiscountDateRange index={index} />
                    </div>
                )}

                {/* Is Active Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Active</Label>
                        <p className="text-sm text-muted-foreground">
                            Show this option in pricing
                        </p>
                    </div>
                    <Switch
                        checked={option.isActive !== false}
                        onCheckedChange={(checked) => setValue(`pricing.pricingOptions.${index}.isActive`, checked)}
                    />
                </div>
            </AccordionContent>
        </>
    );
}

/** "Mar 04, 2026", or "Mar 04, 2026 - Mar 10, 2026" for a range. */
function formatRange(range: DateRange | undefined): string | null {
    if (!range?.from) return null;
    return range.to ? `${format(range.from, 'LLL dd, y')} - ${format(range.to, 'LLL dd, y')}` : format(range.from, 'LLL dd, y');
}

interface DateFieldProps {
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
    placeholder: string;
}

/** A single date picker with a clear button. */
function DateField({ value, onChange, placeholder }: DateFieldProps) {
    const date = value ? new Date(value) : undefined;
    return (
        <div className="flex gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start px-2.5 font-normal flex-1">
                        <CalendarIcon data-icon="inline-start" className="h-4 w-4" />
                        {date ? format(date, 'LLL dd, y') : <span>{placeholder}</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-max !animate-none p-0" style={{ width: 'max-content', padding: 0, animation: 'none' }} align="start">
                    <Calendar mode="single" captionLayout="dropdown" selected={date} onSelect={onChange} initialFocus />
                </PopoverContent>
            </Popover>
            {date && (
                <Button type="button" variant="ghost" size="icon" onClick={() => onChange(undefined)} className="shrink-0">
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

interface DateRangeFieldProps {
    label: string;
    value: EditorDateRange | undefined;
    /** Called with a complete range, or undefined when cleared. */
    onChange: (range: EditorDateRange | undefined) => void;
    placeholder: string;
    hint?: string;
}

/**
 * A date-range picker with a clear button. A half-picked range (start date only) stays local until the end
 * date is picked, so the form only ever holds complete ranges.
 */
function DateRangeField({ label, value, onChange, placeholder, hint }: DateRangeFieldProps) {
    const [pending, setPending] = useState<DateRange | undefined>(undefined);
    const saved: DateRange | undefined = value?.from ? { from: new Date(value.from), to: value.to ? new Date(value.to) : undefined } : undefined;
    const shown = pending ?? saved;

    const handleSelect = (range: DateRange | undefined) => {
        if (range?.from && range.to) {
            setPending(undefined);
            onChange({ from: range.from, to: range.to });
        } else {
            setPending(range);
        }
    };

    const handleClear = () => {
        setPending(undefined);
        onChange(undefined);
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex gap-2">
                <Popover onOpenChange={(open) => { if (!open) setPending(undefined); }}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start px-2.5 font-normal flex-1">
                            <CalendarIcon data-icon="inline-start" className="h-4 w-4" />
                            {formatRange(shown) ?? <span>{placeholder}</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-max !animate-none p-0" style={{ width: 'max-content', padding: 0, animation: 'none' }} align="start">
                        <Calendar
                            mode="range"
                            captionLayout="dropdown"
                            defaultMonth={shown?.from}
                            selected={shown}
                            onSelect={handleSelect}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
                {shown?.from && (
                    <Button type="button" variant="ghost" size="icon" onClick={handleClear} className="shrink-0">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function RecurrenceEndDatePicker() {
    const { setValue, watch } = useTourContext().form;
    return <DateField value={watch('dates.recurrenceEndDate')} onChange={(date) => setValue('dates.recurrenceEndDate', date)} placeholder="Pick an end date (optional)" />;
}

function PriceLockDatePicker() {
    const { setValue, watch } = useTourContext().form;
    return <DateField value={watch('pricing.priceLockDate')} onChange={(date) => setValue('pricing.priceLockDate', date)} placeholder="Pick a date (optional)" />;
}

function DiscountDateRange() {
    const { setValue, watch } = useTourContext().form;
    return (
        <DateRangeField
            label="Discount Valid Period (Optional)"
            value={watch('pricing.discount.dateRange')}
            onChange={(range) => setValue('pricing.discount.dateRange', range)}
            placeholder="Pick a date range (optional)"
            hint="Leave empty to make discount always active"
        />
    );
}

function PricingOptionDiscountDateRange({ index }: { index: number }) {
    const { setValue, watch } = useTourContext().form;
    return (
        <DateRangeField
            label="Discount Valid Period (Optional)"
            value={watch(`pricing.pricingOptions.${index}.discount.dateRange`)}
            onChange={(range) => setValue(`pricing.pricingOptions.${index}.discount.dateRange`, range)}
            placeholder="Pick a date range (optional)"
            hint="Leave empty to make discount always active"
        />
    );
}

/** The single date range of a fixed-schedule tour; picking it fills in days and nights. */
function FixedDateRange() {
    const { setValue, watch } = useTourContext().form;
    return (
        <DateRangeField
            label="Tour Date Range"
            value={watch('dates.dateRange')}
            onChange={(range) => {
                setValue('dates.dateRange', range);
                const { days, nights } = range ? calculateDaysNights(range.from, range.to) : { days: 0, nights: 0 };
                setValue('dates.days', days);
                setValue('dates.nights', nights);
            }}
            placeholder="Pick a date range"
        />
    );
}

/**
 * Departure Item Component
 * Individual departure with date range and configuration
 */
interface DepartureItemProps {
    index: number;
    onRemove: () => void;
}

function DepartureItem({ index, onRemove }: DepartureItemProps) {
    const { register, setValue, watch } = useTourContext().form;
    const departure = watch(`dates.departures.${index}`);

    return (
        <Card>
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                    <h4 className="font-semibold">Departure {index + 1}</h4>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>

                {/* Label */}
                <div className="space-y-2">
                    <Label htmlFor={`dates.departures.${index}.label`}>
                        Label
                    </Label>
                    <Input
                        id={`dates.departures.${index}.label`}
                        placeholder="e.g., Summer 2024"
                        {...register(`dates.departures.${index}.label`)}
                    />
                </div>

                <DateRangeField
                    label="Date Range"
                    value={departure?.dateRange}
                    onChange={(range) => {
                        setValue(`dates.departures.${index}.dateRange`, range);
                        const { days, nights } = range ? calculateDaysNights(range.from, range.to) : { days: 0, nights: 0 };
                        setValue(`dates.departures.${index}.days`, days);
                        setValue(`dates.departures.${index}.nights`, nights);
                    }}
                    placeholder="Pick a date range"
                />

                {/* Capacity */}
                <div className="space-y-2">
                    <Label htmlFor={`dates.departures.${index}.capacity`}>
                        Capacity (Optional)
                    </Label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id={`dates.departures.${index}.capacity`}
                            type="number"
                            min="0"
                            placeholder="Maximum participants"
                            className="pl-10"
                            {...register(`dates.departures.${index}.capacity`, { valueAsNumber: true })}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Inline "Create preset" dialogs
 *
 * Each manages its own open/close state and trigger, so a seller can create
 * a Group Size, Discount, or Pricing Options preset without leaving the
 * add/edit tour page — previously this only linked out to Tour Settings.
 */

interface CreatePaxPresetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (preset: PaxPreset) => void;
}

function CreatePaxPresetDialog({ open, onOpenChange, onCreated }: CreatePaxPresetDialogProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [minSize, setMinSize] = useState('1');
    const [maxSize, setMaxSize] = useState('10');
    const [pricePerPerson, setPricePerPerson] = useState(true);

    const createMutation = useMutation({
        mutationFn: (payload: { name: string; minSize: number; maxSize: number; pricePerPerson: boolean }) => {
            if (!user?.id) throw new Error('User not authenticated');
            return createPaxPreset(user.id, payload);
        },
        onSuccess: (preset, payload) => {
            const normalized: PaxPreset = {
                ...preset,
                _id: presetIdOf(preset),
                name: preset.name || payload.name,
                minSize: Number(preset.minSize ?? payload.minSize),
                maxSize: Number(preset.maxSize ?? payload.maxSize),
                pricePerPerson: preset.pricePerPerson ?? payload.pricePerPerson,
                userId: preset.userId || user?.id || '',
            };
            cacheCreatedPreset(queryClient, queryKeys.presets.pax(user?.id ?? undefined), normalized);
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.pax(user?.id ?? undefined) });
            toast.success('Group size preset created');
            onCreated(normalized);
            onOpenChange(false);
            setName('');
            setMinSize('1');
            setMaxSize('10');
            setPricePerPerson(true);
        },
        onError: (error) => {
            toast.error(apiErrorMessage(error, 'Failed to create preset'));
        },
    });

    const handleSave = () => {
        if (!name.trim()) {
            toast.error('Please enter a preset name');
            return;
        }
        createMutation.mutate({
            name: name.trim(),
            minSize: parseInt(minSize) || 1,
            maxSize: parseInt(maxSize) || 10,
            pricePerPerson,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Group Size Preset</DialogTitle>
                    <DialogDescription>Set minimum and maximum group sizes</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Preset Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Small Group, Large Group" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Minimum Size</Label>
                            <Input type="number" min="1" value={minSize} onChange={(e) => setMinSize(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Maximum Size</Label>
                            <Input type="number" min="1" value={maxSize} onChange={(e) => setMaxSize(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label>Price Per Person</Label>
                        <Switch checked={pricePerPerson} onCheckedChange={setPricePerPerson} />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={createMutation.isPending}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface CreateDiscountPresetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (preset: DiscountPreset) => void;
}

function CreateDiscountPresetDialog({ open, onOpenChange, onCreated }: CreateDiscountPresetDialogProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [type, setType] = useState<'percentage' | 'price'>('percentage');
    const [value, setValue] = useState('');

    const createMutation = useMutation({
        mutationFn: (payload: { name: string; type: 'percentage' | 'price'; value: number }) => {
            if (!user?.id) throw new Error('User not authenticated');
            return createDiscountPreset(user.id, payload);
        },
        onSuccess: (preset, payload) => {
            const normalized: DiscountPreset = {
                ...preset,
                _id: presetIdOf(preset),
                name: preset.name || payload.name,
                type: preset.type || payload.type,
                value: Number(preset.value ?? payload.value),
                userId: preset.userId || user?.id || '',
            };
            cacheCreatedPreset(queryClient, queryKeys.presets.discount(user?.id ?? undefined), normalized);
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.discount(user?.id ?? undefined) });
            toast.success('Discount preset created');
            onCreated(normalized);
            onOpenChange(false);
            setName('');
            setType('percentage');
            setValue('');
        },
        onError: (error) => {
            toast.error(apiErrorMessage(error, 'Failed to create preset'));
        },
    });

    const handleSave = () => {
        if (!name.trim()) {
            toast.error('Please enter a preset name');
            return;
        }
        const numericValue = parseFloat(value) || 0;
        if (numericValue <= 0) {
            toast.error('Discount value must be greater than 0');
            return;
        }
        if (type === 'percentage' && numericValue > 100) {
            toast.error('Percentage discount cannot exceed 100%');
            return;
        }
        createMutation.mutate({
            name: name.trim(),
            type,
            value: parseFloat(value) || 0,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Discount Preset</DialogTitle>
                    <DialogDescription>Define a discount that can be applied to tours</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Preset Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Early Bird 20%, Summer Sale" />
                    </div>
                    <div className="space-y-2">
                        <Label>Discount Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as 'percentage' | 'price')}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="price">Fixed Amount</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}</Label>
                        <Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={createMutation.isPending}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface CreatePricingPresetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (preset: PricingOptionPreset) => void;
}

function CreatePricingPresetDialog({ open, onOpenChange, onCreated }: CreatePricingPresetDialogProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [optionName, setOptionName] = useState('Adult');
    const [basePrice, setBasePrice] = useState('');
    const [minPax, setMinPax] = useState('1');
    const [maxPax, setMaxPax] = useState('50');

    const createMutation = useMutation({
        mutationFn: (payload: { name: string; options: PricingOptionPreset['options'] }) => {
            if (!user?.id) throw new Error('User not authenticated');
            return createPricingPreset(user.id, payload);
        },
        onSuccess: (preset, payload) => {
            const normalized: PricingOptionPreset = {
                ...preset,
                _id: presetIdOf(preset),
                name: preset.name || payload.name,
                options: preset.options?.length ? preset.options : payload.options,
                userId: preset.userId || user?.id || '',
            };
            cacheCreatedPreset(queryClient, queryKeys.presets.pricing(user?.id ?? undefined), normalized);
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.pricing(user?.id ?? undefined) });
            toast.success('Pricing preset created');
            onCreated(normalized);
            onOpenChange(false);
            setName('');
            setOptionName('Adult');
            setBasePrice('');
            setMinPax('1');
            setMaxPax('50');
        },
        onError: (error) => {
            toast.error(apiErrorMessage(error, 'Failed to create preset'));
        },
    });

    const handleSave = () => {
        if (!name.trim()) {
            toast.error('Please enter a preset name');
            return;
        }
        createMutation.mutate({
            name: name.trim(),
            options: [{
                name: optionName.trim() || 'Adult',
                category: 'adult',
                basePrice: parseFloat(basePrice) || 0,
                discountEnabled: false,
                paxRange: { min: parseInt(minPax) || 1, max: parseInt(maxPax) || 50 },
                isActive: true,
            }],
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Pricing Preset</DialogTitle>
                    <DialogDescription>Define pricing options that you can reuse across multiple tours</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Preset Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Age Groups, Seasonal Pricing" />
                    </div>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Option Name</Label>
                                <Input value={optionName} onChange={(e) => setOptionName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Base Price (Optional)</Label>
                                <Input type="number" min="0" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0.00" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Min Pax</Label>
                                <Input type="number" min="1" value={minPax} onChange={(e) => setMinPax(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Pax</Label>
                                <Input type="number" min="1" value={maxPax} onChange={(e) => setMaxPax(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        You can add more options and edit this preset later from Tour Settings.
                    </p>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={createMutation.isPending}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
