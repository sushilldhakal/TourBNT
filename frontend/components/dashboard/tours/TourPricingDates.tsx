'use client';

import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { format } from 'date-fns';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePricingPresets, usePaxPresets, useDiscountPresets } from '@/lib/queries';
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
import { Calendar } from '@/components/ui/calendar-lazy';
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

export function TourPricingDates() {
    const { setValue, watch, control, formState: { errors } } = useFormContext();
    const { user } = useAuth();

    // Watch pricing values
    const pricing = watch('pricing') || {};
    const price = pricing.price || 0;
    const pricePerPerson = pricing.pricePerPerson ?? true;
    const minSize = pricing.minSize || 1;
    const maxSize = pricing.maxSize || 10;
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

    // Sync local state with form state
    React.useEffect(() => {
        setLocalPaxPresetId(paxPresetId);
    }, [paxPresetId]);

    React.useEffect(() => {
        setLocalDiscountPresetId(discountPresetId);
    }, [discountPresetId]);

    // Local state for pricing preset selector (multi-select)
    const [pricingPresetSelectorValue, setPricingPresetSelectorValue] = useState<string>('');

    const { data: pricingPresets = [], isLoading: isLoadingPricingPresets } = usePricingPresets(user?.id, !!user?.id);
    const { data: paxPresets = [], isLoading: isLoadingPaxPresets } = usePaxPresets(user?.id, !!user?.id);
    const { data: discountPresets = [], isLoading: isLoadingDiscountPresets } = useDiscountPresets(user?.id, !!user?.id);

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
    const selectedDiscountPreset = discountPresets.find(p => String(p._id) === String(localDiscountPresetId || discountPresetId));

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
                                onChange={(e) => setValue('pricing.price', parseFloat(e.target.value) || 0)}
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
                                        if (value === 'custom') {
                                            setLocalPaxPresetId(undefined);
                                            setValue('paxPresetId', undefined, { shouldDirty: true, shouldValidate: false });
                                        } else if (value !== 'loading' && value !== 'none') {
                                            const presetId = value;
                                            setLocalPaxPresetId(presetId);
                                            setValue('paxPresetId', presetId, { shouldDirty: true, shouldValidate: false });
                                            const preset = paxPresets.find(p => String(p._id) === String(presetId));
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
                                        {isLoadingPaxPresets ? (
                                            <SelectItem value="loading" disabled>Loading presets...</SelectItem>
                                        ) : paxPresets.length > 0 ? (
                                            paxPresets.map((preset) => (
                                                <SelectItem
                                                    key={preset._id}
                                                    value={String(preset._id)}
                                                >
                                                    {preset.name} ({preset.minSize}-{preset.maxSize} {preset.pricePerPerson ? 'per person' : 'per group'})
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                No presets available. <a href="/dashboard/tours/settings" className="text-primary underline ml-1">Create one</a>
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
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
                                        onChange={(e) => setValue('pricing.minSize', parseInt(e.target.value) || 1)}
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
                                        onChange={(e) => setValue('pricing.maxSize', parseInt(e.target.value) || 1)}
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
                                                const preset = discountPresets.find(p => String(p._id) === String(presetId));
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
                                            {isLoadingDiscountPresets ? (
                                                <SelectItem value="loading" disabled>Loading presets...</SelectItem>
                                            ) : discountPresets.length > 0 ? (
                                                discountPresets.map((preset) => (
                                                    <SelectItem
                                                        key={preset._id}
                                                        value={String(preset._id)}
                                                    >
                                                        {preset.name} ({preset.type === 'percentage' ? `${preset.value}%` : `$${preset.value}`})
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>
                                                    No presets available. <a href="/dashboard/tours/settings" className="text-primary underline ml-1">Create one</a>
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
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
                                    onValueChange={(value) => setValue('pricing.discount.type', value)}
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
                                                    const selectedPreset = pricingPresets.find(p => String(p._id) === String(presetId));
                                                    if (selectedPreset && selectedPreset.options && Array.isArray(selectedPreset.options)) {
                                                        // Add each option from the preset to the form
                                                        selectedPreset.options.forEach((presetOption) => {
                                                            // Convert preset option to form format
                                                            // The preset uses 'basePrice' but form uses 'price'
                                                            const presetPrice = presetOption.basePrice ?? 0;
                                                            const formOption = {
                                                                name: presetOption.name || '',
                                                                category: presetOption.category || 'adult',
                                                                customCategory: presetOption.customCategory || '',
                                                                price: presetPrice,
                                                                discountEnabled: presetOption.discountEnabled || false,
                                                                discount: presetOption.discount ? {
                                                                    type: presetOption.discount.type || 'percentage',
                                                                    value: presetOption.discount.value || 0,
                                                                    dateRange: presetOption.discount.dateRange ? {
                                                                        from: presetOption.discount.dateRange.from ? new Date(presetOption.discount.dateRange.from) : undefined,
                                                                        to: presetOption.discount.dateRange.to ? new Date(presetOption.discount.dateRange.to) : undefined,
                                                                    } : undefined,
                                                                } : undefined,
                                                                paxRange: presetOption.paxRange ? {
                                                                    min: presetOption.paxRange.min || 1,
                                                                    max: presetOption.paxRange.max || 22,
                                                                } : { min: 1, max: 22 },
                                                                isActive: presetOption.isActive !== undefined ? presetOption.isActive : true,
                                                            };
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
                                            {isLoadingPricingPresets ? (
                                                <SelectItem value="loading" disabled>Loading presets...</SelectItem>
                                            ) : pricingPresets.length > 0 ? (
                                                pricingPresets
                                                    .filter(preset => !(Array.isArray(pricingPresetIds) && pricingPresetIds.some(id => String(id) === String(preset._id))))
                                                    .map((preset) => (
                                                        <SelectItem
                                                            key={preset._id}
                                                            value={String(preset._id)}
                                                        >
                                                            {preset.name}
                                                        </SelectItem>
                                                    ))
                                            ) : (
                                                <SelectItem value="none" disabled>
                                                    No presets available. <a href="/dashboard/tours/settings" className="text-primary underline ml-1">Create one</a>
                                                </SelectItem>
                                            )}
                                            {pricingPresets.length > 0 &&
                                                Array.isArray(pricingPresetIds) &&
                                                pricingPresetIds.length === pricingPresets.length && (
                                                    <SelectItem value="none" disabled>
                                                        All presets selected
                                                    </SelectItem>
                                                )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Show selected presets */}
                                {Array.isArray(pricingPresetIds) && pricingPresetIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {pricingPresetIds.map((presetId) => {
                                            const preset = pricingPresets.find(p => p._id === presetId);
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
                            onValueChange={(value) => setValue('dates.scheduleType', value)}
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
                                        onValueChange={(value) => setValue('dates.recurrencePattern', value)}
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
    const { register, setValue, watch } = useFormContext();
    const { user } = useAuth();
    const option = watch(`pricing.pricingOptions.${index}`) || {};
    const discountEnabled = option.discountEnabled || false;
    const paxRange = option.paxRange || { min: 1, max: 22 };

    const { data: discountPresets = [], isLoading: isLoadingDiscountPresets } = useDiscountPresets(user?.id, !!user?.id);

    // Local state for discount preset selection
    const [localDiscountPresetId, setLocalDiscountPresetId] = useState<string | undefined>(undefined);

    // Get selected discount preset
    const selectedDiscountPreset = discountPresets.find(p => String(p._id) === String(localDiscountPresetId));

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
                        onValueChange={(value) => setValue(`pricing.pricingOptions.${index}.category`, value)}
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
                        onCheckedChange={(checked) => setValue(`pricing.pricingOptions.${index}.discountEnabled`, checked)}
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
                                        if (value === 'custom') {
                                            setLocalDiscountPresetId(undefined);
                                            // Reset to default values
                                            setValue(`pricing.pricingOptions.${index}.discount.type`, 'percentage');
                                            setValue(`pricing.pricingOptions.${index}.discount.value`, 0);
                                            setValue(`pricing.pricingOptions.${index}.discount.dateRange`, undefined);
                                        } else if (value !== 'loading' && value !== 'none') {
                                            const presetId = value;
                                            setLocalDiscountPresetId(presetId);
                                            const preset = discountPresets.find(p => String(p._id) === String(presetId));
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
                                        {isLoadingDiscountPresets ? (
                                            <SelectItem value="loading" disabled>Loading presets...</SelectItem>
                                        ) : discountPresets.length > 0 ? (
                                            discountPresets.map((preset) => (
                                                <SelectItem
                                                    key={preset._id}
                                                    value={String(preset._id)}
                                                >
                                                    {preset.name} ({preset.type === 'percentage' ? `${preset.value}%` : `$${preset.value}`})
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                No presets available. <a href="/dashboard/tours/settings" className="text-primary underline ml-1">Create one</a>
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
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
                                onValueChange={(value) => setValue(`pricing.pricingOptions.${index}.discount.type`, value)}
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

/**
 * Recurrence End Date Picker Component
 * Single date picker for recurrence end date
 */
function RecurrenceEndDatePicker() {
    const { setValue, watch } = useFormContext();
    const recurrenceEndDate = watch('dates.recurrenceEndDate');
    const [date, setDate] = useState<Date | undefined>(
        recurrenceEndDate ? new Date(recurrenceEndDate) : undefined
    );

    // Sync local state with form state when form value changes
    React.useEffect(() => {
        if (recurrenceEndDate) {
            setDate(new Date(recurrenceEndDate));
        } else {
            setDate(undefined);
        }
    }, [recurrenceEndDate]);

    const handleDateChange = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        if (selectedDate) {
            setValue('dates.recurrenceEndDate', selectedDate);
        } else {
            setValue('dates.recurrenceEndDate', undefined);
        }
    };

    const handleClear = () => {
        setDate(undefined);
        setValue('dates.recurrenceEndDate', undefined);
    };

    return (
        <div className="flex gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="justify-start px-2.5 font-normal flex-1"
                    >
                        <CalendarIcon data-icon="inline-start" className="h-4 w-4" />
                        {date ? (
                            format(date, "LLL dd, y")
                        ) : (
                            <span>Pick an end date (optional)</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateChange}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            {date && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    className="shrink-0"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

/**
 * Price Lock Date Picker Component
 * Single date picker for price lock date
 */
function PriceLockDatePicker() {
    const { setValue, watch } = useFormContext();
    const priceLockDate = watch('pricing.priceLockDate');
    const [date, setDate] = useState<Date | undefined>(
        priceLockDate ? new Date(priceLockDate) : undefined
    );

    // Sync local state with form state when form value changes
    React.useEffect(() => {
        if (priceLockDate) {
            setDate(new Date(priceLockDate));
        } else {
            setDate(undefined);
        }
    }, [priceLockDate]);

    const handleDateChange = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        if (selectedDate) {
            setValue('pricing.priceLockDate', selectedDate);
        } else {
            setValue('pricing.priceLockDate', undefined);
        }
    };

    const handleClear = () => {
        setDate(undefined);
        setValue('pricing.priceLockDate', undefined);
    };

    return (
        <div className="flex gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="justify-start px-2.5 font-normal flex-1"
                    >
                        <CalendarIcon data-icon="inline-start" className="h-4 w-4" />
                        {date ? (
                            format(date, "LLL dd, y")
                        ) : (
                            <span>Pick a date (optional)</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateChange}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            {date && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    className="shrink-0"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

/**
 * Discount Date Range Component
 * Date range picker for discount validity
 */
function DiscountDateRange() {
    const { setValue, watch } = useFormContext();
    const dateRange = watch('pricing.discount.dateRange') || {};
    const [date, setDate] = useState<DateRange | undefined>({
        from: dateRange.from ? new Date(dateRange.from) : undefined,
        to: dateRange.to ? new Date(dateRange.to) : undefined,
    });

    // Sync local state with form state when form value changes (e.g., from preset)
    React.useEffect(() => {
        if (dateRange.from || dateRange.to) {
            setDate({
                from: dateRange.from ? new Date(dateRange.from) : undefined,
                to: dateRange.to ? new Date(dateRange.to) : undefined,
            });
        } else if (!dateRange.from && !dateRange.to) {
            setDate(undefined);
        }
    }, [dateRange.from, dateRange.to]);

    const handleDateChange = (range: DateRange | undefined) => {
        setDate(range);
        if (range) {
            setValue('pricing.discount.dateRange', range);
        } else {
            setValue('pricing.discount.dateRange', undefined);
        }
    };

    const handleClear = () => {
        setDate(undefined);
        setValue('pricing.discount.dateRange', undefined);
    };

    return (
        <div className="space-y-2">
            <Label>Discount Valid Period (Optional)</Label>
            <div className="flex gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="justify-start px-2.5 font-normal flex-1"
                        >
                            <CalendarIcon data-icon="inline-start" className="h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range (optional)</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleDateChange}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
                {date?.from && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
                Leave empty to make discount always active
            </p>
        </div>
    );
}

/**
 * Pricing Option Discount Date Range Component
 * Date range picker for pricing option discount validity
 */
interface PricingOptionDiscountDateRangeProps {
    index: number;
}

function PricingOptionDiscountDateRange({ index }: PricingOptionDiscountDateRangeProps) {
    const { setValue, watch } = useFormContext();
    const dateRange = watch(`pricing.pricingOptions.${index}.discount.dateRange`) || {};
    const [date, setDate] = useState<DateRange | undefined>({
        from: dateRange.from ? new Date(dateRange.from) : undefined,
        to: dateRange.to ? new Date(dateRange.to) : undefined,
    });

    // Sync local state with form state when form value changes
    React.useEffect(() => {
        if (dateRange.from || dateRange.to) {
            const newDate: DateRange = {
                from: dateRange.from ? new Date(dateRange.from) : undefined,
                to: dateRange.to ? new Date(dateRange.to) : undefined,
            } as DateRange;
            setDate(newDate);
        } else if (!dateRange.from && !dateRange.to) {
            setDate(undefined);
        }
    }, [dateRange.from, dateRange.to]);

    const handleDateChange = (range: DateRange | undefined) => {
        setDate(range);
        if (range) {
            setValue(`pricing.pricingOptions.${index}.discount.dateRange`, range);
        } else {
            setValue(`pricing.pricingOptions.${index}.discount.dateRange`, undefined);
        }
    };

    const handleClear = () => {
        setDate(undefined);
        setValue(`pricing.pricingOptions.${index}.discount.dateRange`, undefined);
    };

    return (
        <div className="space-y-2">
            <Label>Discount Valid Period (Optional)</Label>
            <div className="flex gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="justify-start px-2.5 font-normal flex-1"
                        >
                            <CalendarIcon data-icon="inline-start" className="h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range (optional)</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleDateChange}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
                {date?.from && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
                Leave empty to make discount always active
            </p>
        </div>
    );
}

/**
 * Fixed Date Range Component
 * Single date range for fixed schedule tours
 */
function FixedDateRange() {
    const { setValue, watch } = useFormContext();
    const dateRange = watch('dates.dateRange') || {};
    const [date, setDate] = useState<DateRange | undefined>({
        from: dateRange.from ? new Date(dateRange.from) : undefined,
        to: dateRange.to ? new Date(dateRange.to) : undefined,
    });

    // Sync local state with form state when form value changes
    React.useEffect(() => {
        if (dateRange.from || dateRange.to) {
            setDate({
                from: dateRange.from ? new Date(dateRange.from) : undefined,
                to: dateRange.to ? new Date(dateRange.to) : undefined,
            });
        } else if (!dateRange.from && !dateRange.to) {
            setDate(undefined);
        }
    }, [dateRange.from, dateRange.to]);

    const handleDateChange = (range: DateRange | undefined) => {
        setDate(range);
        if (range) {
            setValue('dates.dateRange', range);

            // Auto-calculate days and nights
            if (range.from && range.to) {
                const { days, nights } = calculateDaysNights(range.from, range.to);
                setValue('dates.days', days);
                setValue('dates.nights', nights);
            }
        } else {
            setValue('dates.dateRange', undefined);
        }
    };

    const handleClear = () => {
        setDate(undefined);
        setValue('dates.dateRange', undefined);
        setValue('dates.days', 0);
        setValue('dates.nights', 0);
    };

    return (
        <div className="space-y-2">
            <Label>Tour Date Range</Label>
            <div className="flex gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="justify-start px-2.5 font-normal flex-1"
                        >
                            <CalendarIcon data-icon="inline-start" className="h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleDateChange}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
                {date?.from && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
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
    const { register, setValue, watch } = useFormContext();
    const departure = watch(`dates.departures.${index}`) || {};
    const [date, setDate] = useState<DateRange | undefined>({
        from: departure.dateRange?.from ? new Date(departure.dateRange.from) : undefined,
        to: departure.dateRange?.to ? new Date(departure.dateRange.to) : undefined,
    });

    // Sync local state with form state when form value changes
    React.useEffect(() => {
        const dateRange = departure.dateRange || {};
        if (dateRange.from || dateRange.to) {
            setDate({
                from: dateRange.from ? new Date(dateRange.from) : undefined,
                to: dateRange.to ? new Date(dateRange.to) : undefined,
            });
        } else if (!dateRange.from && !dateRange.to) {
            setDate(undefined);
        }
    }, [departure.dateRange]);

    const handleDateChange = (range: DateRange | undefined) => {
        setDate(range);
        if (range) {
            setValue(`dates.departures.${index}.dateRange`, range);

            // Auto-calculate days and nights
            if (range.from && range.to) {
                const { days, nights } = calculateDaysNights(range.from, range.to);
                setValue(`dates.departures.${index}.days`, days);
                setValue(`dates.departures.${index}.nights`, nights);
            }
        } else {
            setValue(`dates.departures.${index}.dateRange`, undefined);
        }
    };

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

                {/* Date Range */}
                <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="justify-start px-2.5 font-normal flex-1"
                                >
                                    <CalendarIcon data-icon="inline-start" className="h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y")} -{" "}
                                                {format(date.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={handleDateChange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                        {date?.from && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setDate(undefined);
                                    setValue(`dates.departures.${index}.dateRange`, undefined);
                                    setValue(`dates.departures.${index}.days`, 0);
                                    setValue(`dates.departures.${index}.nights`, 0);
                                }}
                                className="shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

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
