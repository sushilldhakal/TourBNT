'use client';

import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { format } from 'date-fns';
import {
    Calendar as CalendarIcon,
    Plus,
    Trash2,
    DollarSign,
    Percent,
    Users,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DualRangeSlider } from '@/components/ui/dual-range-slider';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    generateUniqueId,
    getDefaultPricingOption,
    getDefaultDeparture,
    calculateDaysNights,
} from '@/lib/utils/defaultTourValues';

/**
 * TourPricingDates Component
 * Handles pricing configuration and date scheduling for tours
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

export function TourPricingDates() {
    const { register, setValue, watch, control, formState: { errors } } = useFormContext();

    // Watch pricing values
    const pricing = watch('pricing') || {};
    const price = pricing.price || 0;
    const pricePerPerson = pricing.pricePerPerson ?? true;
    const minSize = pricing.minSize || 1;
    const maxSize = pricing.maxSize || 10;
    const pricingOptionsEnabled = pricing.pricingOptionsEnabled || false;
    const discountEnabled = pricing.discount?.discountEnabled || false;

    // Watch dates values
    const dates = watch('dates') || {};
    const scheduleType = dates.scheduleType || 'flexible';
    const days = dates.days || 0;
    const nights = dates.nights || 0;

    // Field arrays for dynamic sections
    const { fields: pricingOptions, append: appendPricingOption, remove: removePricingOption } = useFieldArray({
        control,
        name: 'pricing.pricingOptions',
    });

    const { fields: departures, append: appendDeparture, remove: removeDeparture } = useFieldArray({
        control,
        name: 'dates.departures',
    });

    return (
        <div className="space-y-8">
            {/* Base Pricing Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Base Pricing</CardTitle>
                    <CardDescription>
                        Set the base price and group size for this tour
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Base Price */}
                    <div className="space-y-2">
                        <Label htmlFor="pricing.price">
                            Base Price <span className="text-destructive">*</span>
                        </Label>
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
                        {(errors.pricing as any)?.price && (
                            <p className="text-sm text-destructive">
                                {(errors.pricing as any)?.price?.message as string}
                            </p>
                        )}
                    </div>

                    {/* Price Per Person Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Price Per Person</Label>
                            <p className="text-sm text-muted-foreground">
                                Price is calculated per person
                            </p>
                        </div>
                        <Switch
                            checked={pricePerPerson}
                            onCheckedChange={(checked) => setValue('pricing.pricePerPerson', checked)}
                        />
                    </div>

                    {/* Group Size */}
                    <div className="space-y-4">
                        <Label>Group Size Range</Label>
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

            {/* Discount Configuration */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Discount Configuration</CardTitle>
                            <CardDescription>
                                Offer discounts for this tour
                            </CardDescription>
                        </div>
                        <Switch
                            checked={discountEnabled}
                            onCheckedChange={(checked) => setValue('pricing.discount.discountEnabled', checked)}
                        />
                    </div>
                </CardHeader>
                {discountEnabled && (
                    <CardContent className="space-y-6">
                        {/* Discount Type */}
                        <div className="space-y-2">
                            <Label>Discount Type</Label>
                            <RadioGroup
                                value={pricing.discount?.percentageOrPrice ? 'percentage' : 'fixed'}
                                onValueChange={(value) => setValue('pricing.discount.percentageOrPrice', value === 'percentage')}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="percentage" id="percentage" />
                                    <Label htmlFor="percentage" className="font-normal cursor-pointer">
                                        Percentage Discount
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="fixed" id="fixed" />
                                    <Label htmlFor="fixed" className="font-normal cursor-pointer">
                                        Fixed Amount Discount
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Discount Value */}
                        {pricing.discount?.percentageOrPrice ? (
                            <div className="space-y-2">
                                <Label htmlFor="pricing.discount.discountPercentage">
                                    Discount Percentage
                                </Label>
                                <div className="relative">
                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="pricing.discount.discountPercentage"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        placeholder="0"
                                        className="pl-10"
                                        value={pricing.discount?.discountPercentage || 0}
                                        onChange={(e) => setValue('pricing.discount.discountPercentage', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="pricing.discount.discountPrice">
                                    Discount Amount
                                </Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="pricing.discount.discountPrice"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-10"
                                        value={pricing.discount?.discountPrice || 0}
                                        onChange={(e) => setValue('pricing.discount.discountPrice', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Discount Code */}
                        <div className="space-y-2">
                            <Label htmlFor="pricing.discount.discountCode">
                                Discount Code (Optional)
                            </Label>
                            <Input
                                id="pricing.discount.discountCode"
                                placeholder="Enter discount code"
                                value={pricing.discount?.discountCode || ''}
                                onChange={(e) => setValue('pricing.discount.discountCode', e.target.value)}
                            />
                        </div>

                        {/* Discount Description */}
                        <div className="space-y-2">
                            <Label htmlFor="pricing.discount.description">
                                Description
                            </Label>
                            <Textarea
                                id="pricing.discount.description"
                                placeholder="Describe the discount offer"
                                rows={2}
                                value={pricing.discount?.description || ''}
                                onChange={(e) => setValue('pricing.discount.description', e.target.value)}
                            />
                        </div>

                        {/* Discount Date Range */}
                        <DiscountDateRange />
                    </CardContent>
                )}
            </Card>

            {/* Advanced Pricing Options */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Advanced Pricing Options</CardTitle>
                            <CardDescription>
                                Create multiple pricing tiers (Adult, Child, Senior, etc.)
                            </CardDescription>
                        </div>
                        <Switch
                            checked={pricingOptionsEnabled}
                            onCheckedChange={(checked) => setValue('pricing.pricingOptionsEnabled', checked)}
                        />
                    </div>
                </CardHeader>
                {pricingOptionsEnabled && (
                    <CardContent className="space-y-4">
                        {pricingOptions.map((field, index) => (
                            <PricingOptionItem
                                key={field.id}
                                index={index}
                                onRemove={() => removePricingOption(index)}
                            />
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => appendPricingOption(getDefaultPricingOption())}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Pricing Option
                        </Button>
                    </CardContent>
                )}
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
    const { register, setValue, watch, formState: { errors } } = useFormContext();
    const option = watch(`pricing.pricingOptions.${index}`) || {};

    return (
        <Card>
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                    <h4 className="font-semibold">Pricing Option {index + 1}</h4>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>

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
            </CardContent>
        </Card>
    );
}

/**
 * Discount Date Range Component
 * Date range picker for discount validity
 */
function DiscountDateRange() {
    const { setValue, watch } = useFormContext();
    const dateRange = watch('pricing.discount.dateRange') || {};
    const [date, setDate] = useState<{ from?: Date; to?: Date }>({
        from: dateRange.from ? new Date(dateRange.from) : undefined,
        to: dateRange.to ? new Date(dateRange.to) : undefined,
    });

    const handleDateChange = (range: any) => {
        if (range) {
            setDate(range);
            setValue('pricing.discount.dateRange', range);
        }
    };

    return (
        <div className="space-y-2">
            <Label>Discount Valid Period</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            'w-full justify-start text-left font-normal',
                            !date.from && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                                </>
                            ) : (
                                format(date.from, 'LLL dd, y')
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date.from}
                        selected={date as any}
                        onSelect={handleDateChange}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
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
    const [date, setDate] = useState<{ from?: Date; to?: Date }>({
        from: dateRange.from ? new Date(dateRange.from) : undefined,
        to: dateRange.to ? new Date(dateRange.to) : undefined,
    });

    const handleDateChange = (range: any) => {
        if (range) {
            setDate(range);
            setValue('dates.dateRange', range);

            // Auto-calculate days and nights
            if (range.from && range.to) {
                const { days, nights } = calculateDaysNights(range.from, range.to);
                setValue('dates.days', days);
                setValue('dates.nights', nights);
            }
        }
    };

    return (
        <div className="space-y-2">
            <Label>Tour Date Range</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            'w-full justify-start text-left font-normal',
                            !date.from && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                                </>
                            ) : (
                                format(date.from, 'LLL dd, y')
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date.from}
                        selected={date as any}
                        onSelect={handleDateChange}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
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
    const [date, setDate] = useState<{ from?: Date; to?: Date }>({
        from: departure.dateRange?.from ? new Date(departure.dateRange.from) : undefined,
        to: departure.dateRange?.to ? new Date(departure.dateRange.to) : undefined,
    });

    const handleDateChange = (range: any) => {
        if (range) {
            setDate(range);
            setValue(`dates.departures.${index}.dateRange`, range);

            // Auto-calculate days and nights
            if (range.from && range.to) {
                const { days, nights } = calculateDaysNights(range.from, range.to);
                setValue(`dates.departures.${index}.days`, days);
                setValue(`dates.departures.${index}.nights`, nights);
            }
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
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !date.from && 'text-muted-foreground'
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                                        </>
                                    ) : (
                                        format(date.from, 'LLL dd, y')
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date.from}
                                selected={date as any}
                                onSelect={handleDateChange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
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
