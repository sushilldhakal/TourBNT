'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Users, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PricingOption {
    id: string;
    name: string;
    price: number;
    description: string;
    maxTravelers: number;
}

interface DatePickerProps {
    tourId: string;
    availableDates: Date[];
    onDateSelect: (date: Date, pricing: PricingOption) => void;
}

export function DatePicker({ tourId, availableDates, onDateSelect }: DatePickerProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
    const [selectedPricing, setSelectedPricing] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch pricing options when date is selected
    useEffect(() => {
        if (selectedDate) {
            fetchPricingOptions(selectedDate);
        }
    }, [selectedDate]);

    const fetchPricingOptions = async (date: Date) => {
        setIsLoading(true);
        setError(null);
        try {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/tours/${tourId}/pricing?date=${format(date, 'yyyy-MM-dd')}`);
            // const data = await response.json();

            // Mock data for now
            await new Promise(resolve => setTimeout(resolve, 500));
            const mockPricing: PricingOption[] = [
                {
                    id: '1',
                    name: 'Standard Package',
                    price: 299,
                    description: 'Includes basic amenities and guided tour',
                    maxTravelers: 10,
                },
                {
                    id: '2',
                    name: 'Premium Package',
                    price: 499,
                    description: 'Includes all amenities, meals, and private guide',
                    maxTravelers: 6,
                },
                {
                    id: '3',
                    name: 'Luxury Package',
                    price: 799,
                    description: 'All-inclusive with premium accommodations',
                    maxTravelers: 4,
                },
            ];
            setPricingOptions(mockPricing);
        } catch (err) {
            setError('Failed to load pricing options. Please try again.');
            console.error('Error fetching pricing:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date);
        setSelectedPricing('');
    };

    const handlePricingSelect = (pricingId: string) => {
        setSelectedPricing(pricingId);
        const pricing = pricingOptions.find(p => p.id === pricingId);
        if (pricing && selectedDate) {
            onDateSelect(selectedDate, pricing);
        }
    };

    const isDateAvailable = (date: Date) => {
        return availableDates.some(
            availableDate => format(availableDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Calendar Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        Select Date
                    </CardTitle>
                    <CardDescription>
                        Choose your preferred travel date
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => !isDateAvailable(date) || date < new Date()}
                        className="rounded-md border"
                        modifiers={{
                            available: availableDates,
                        }}
                        modifiersStyles={{
                            available: {
                                fontWeight: 'bold',
                                textDecoration: 'underline',
                            },
                        }}
                    />
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="h-3 w-3 rounded-full bg-primary" />
                            <span className="text-muted-foreground">Selected date</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="h-3 w-3 rounded-full border-2 border-primary" />
                            <span className="text-muted-foreground">Available dates</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Pricing Options Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Pricing Options
                    </CardTitle>
                    <CardDescription>
                        {selectedDate
                            ? `Available packages for ${format(selectedDate, 'MMMM d, yyyy')}`
                            : 'Select a date to view pricing options'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!selectedDate && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Please select a date from the calendar to view available pricing options.
                            </AlertDescription>
                        </Alert>
                    )}

                    {selectedDate && isLoading && (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedDate && error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {selectedDate && !isLoading && !error && pricingOptions.length > 0 && (
                        <RadioGroup value={selectedPricing} onValueChange={handlePricingSelect}>
                            <div className="space-y-4">
                                {pricingOptions.map((option) => (
                                    <div
                                        key={option.id}
                                        className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent transition-colors"
                                    >
                                        <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                                        <div className="flex-1 space-y-1">
                                            <Label
                                                htmlFor={option.id}
                                                className="text-base font-semibold cursor-pointer"
                                            >
                                                {option.name}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                {option.description}
                                            </p>
                                            <div className="flex items-center gap-4 pt-2">
                                                <Badge variant="secondary" className="flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3" />
                                                    ${option.price} per person
                                                </Badge>
                                                <Badge variant="outline" className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    Max {option.maxTravelers} travelers
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </RadioGroup>
                    )}

                    {selectedDate && !isLoading && !error && pricingOptions.length === 0 && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No pricing options available for the selected date.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
