'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createBooking } from '@/lib/api/bookingApi';
import { CartBooking } from '@/lib/cartUtils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tour, PricingOption } from '@/lib/types';
import { generateDepartureInstances, calculateDeparturePrice } from '@/lib/tourUtils';

interface FrontBookingProps {
    tourData: Tour;
    prefilledDate?: Date;
}

interface BookingFormData {
    fullName: string;
    email: string;
    phone: string;
    departureDate: string;
    adults: number;
    children: number;
    specialRequests: string;
}

interface EnquiryFormData {
    fullName: string;
    email: string;
    message: string;
}

export function FrontBooking({ tourData, prefilledDate }: FrontBookingProps) {
    const router = useRouter();
    const { toast } = useToast();

    const [bookingForm, setBookingForm] = useState<BookingFormData>({
        fullName: '',
        email: '',
        phone: '',
        departureDate: prefilledDate ? format(prefilledDate, 'yyyy-MM-dd') : '',
        adults: 1,
        children: 0,
        specialRequests: ''
    });

    const [enquiryForm, setEnquiryForm] = useState<EnquiryFormData>({
        fullName: '',
        email: '',
        message: ''
    });

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(prefilledDate);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();

    // Generate available dates and price map
    const { availableDates, datePriceMap } = useMemo(() => {
        const dates: Date[] = [];
        const priceMap = new Map<string, { price: number; discountedPrice?: number }>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!tourData.tourDates?.departures) {
            return { availableDates: dates, datePriceMap: priceMap };
        }

        // Generate all departure instances
        const allDepartures = generateDepartureInstances(tourData.tourDates);

        allDepartures.forEach((departure) => {
            const departureDate = new Date(departure.dateRange.from);
            if (departureDate >= today) {
                const dateKey = format(departureDate, 'yyyy-MM-dd');
                dates.push(departureDate);

                // Calculate pricing for this departure
                const pricing = calculateDeparturePrice(
                    departure,
                    tourData.price,
                    tourData.salePrice,
                    tourData.saleEnabled,
                    tourData.pricingOptions,
                    tourData.pricingGroups
                );

                priceMap.set(dateKey, {
                    price: pricing.originalPrice,
                    discountedPrice: pricing.hasDiscount ? pricing.displayPrice : undefined
                });
            }
        });

        return { availableDates: dates, datePriceMap: priceMap };
    }, [tourData]);

    // Update form when prefilled date changes
    useEffect(() => {
        if (prefilledDate) {
            setSelectedDate(prefilledDate);
            setBookingForm(prev => ({
                ...prev,
                departureDate: format(prefilledDate, 'yyyy-MM-dd')
            }));

            // Calculate end date based on tour duration
            const days = tourData.tourDates?.days || 1;
            const endDate = new Date(prefilledDate);
            endDate.setDate(endDate.getDate() + days - 1);
            setDateRange({ from: prefilledDate, to: endDate });
        }
    }, [prefilledDate, tourData.tourDates?.days]);

    // Calculate pricing
    const calculatePricing = () => {
        let basePrice = tourData.price || 0;
        let originalPrice = basePrice;

        // Check if sale price is enabled
        if (tourData.saleEnabled && tourData.salePrice) {
            originalPrice = tourData.price || 0;
            basePrice = tourData.salePrice;
        }
        // If a date is selected, use the price from datePriceMap
        else if (selectedDate) {
            const dateKey = format(selectedDate, 'yyyy-MM-dd');
            const priceInfo = datePriceMap.get(dateKey);

            if (priceInfo) {
                originalPrice = priceInfo.price;
                basePrice = priceInfo.discountedPrice || priceInfo.price;
            }
        }

        const adultPrice = basePrice * bookingForm.adults;
        const childPrice = basePrice * bookingForm.children * 0.7; // 30% discount for children
        const totalPrice = adultPrice + childPrice;

        return {
            basePrice,
            originalPrice,
            adultPrice,
            childPrice,
            totalPrice,
            currency: 'USD'
        };
    };

    const pricing = calculatePricing();

    // Format price
    const formatPrice = (price: number): string => {
        return price.toFixed(2);
    };

    // Booking mutation
    const bookingMutation = useMutation({
        mutationFn: (bookingData: Omit<CartBooking, 'bookingReference'>) => createBooking(bookingData),
        onSuccess: (response) => {
            const bookingData = response.data;
            toast({
                title: "Booking Successful!",
                description: `Your booking reference is: ${bookingData.bookingReference}. Redirecting to cart...`,
            });

            // Store booking in localStorage for cart
            const existingBookings = JSON.parse(localStorage.getItem('cartBookings') || '[]');
            existingBookings.push({
                ...bookingData,
                tourImage: tourData.coverImage,
                quantity: 1
            });
            localStorage.setItem('cartBookings', JSON.stringify(existingBookings));

            // Reset form
            setBookingForm({
                fullName: '',
                email: '',
                phone: '',
                departureDate: '',
                adults: 1,
                children: 0,
                specialRequests: ''
            });
            setSelectedDate(undefined);
            setDateRange(undefined);

            // Redirect to cart page
            setTimeout(() => {
                router.push('/cart');
            }, 1500);
        },
        onError: (error: Error) => {
            toast({
                title: "Booking Failed",
                description: error.message || "Something went wrong. Please try again.",
                variant: "destructive",
            });
        }
    });

    // Handle booking submission
    const handleBookingSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!bookingForm.fullName || !bookingForm.email || !bookingForm.phone || !bookingForm.departureDate) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(bookingForm.email)) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address",
                variant: "destructive",
            });
            return;
        }

        // Date validation
        const selectedDate = new Date(bookingForm.departureDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            toast({
                title: "Invalid Date",
                description: "Departure date cannot be in the past",
                variant: "destructive",
            });
            return;
        }

        // Prepare booking data
        const bookingData: Omit<CartBooking, 'bookingReference'> = {
            _id: tourData._id,
            tourTitle: tourData.title,
            tourCode: tourData.code || `TOUR-${tourData._id.slice(-8).toUpperCase()}`,
            tourImage: tourData.coverImage || '',
            departureDate: bookingForm.departureDate,
            participants: {
                adults: bookingForm.adults,
                children: bookingForm.children
            },
            contactName: bookingForm.fullName,
            contactEmail: bookingForm.email,
            contactPhone: bookingForm.phone,
            specialRequests: bookingForm.specialRequests,
            pricing: {
                totalPrice: pricing.totalPrice,
                currency: pricing.currency
            }
        };

        bookingMutation.mutate(bookingData);
    };

    // Handle enquiry submission
    const handleEnquirySubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!enquiryForm.fullName || !enquiryForm.email || !enquiryForm.message) {
            toast({
                title: "Missing Information",
                description: "Please fill in all fields",
                variant: "destructive",
            });
            return;
        }

        // For now, just show success message
        toast({
            title: "Enquiry Sent!",
            description: "We'll get back to you soon.",
        });

        setEnquiryForm({
            fullName: '',
            email: '',
            message: ''
        });
    };

    return (
        <div>
            <Tabs defaultValue="booking">
                <TabsList className={`grid w-full ${tourData?.enquiry ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <TabsTrigger value="booking">Booking Form</TabsTrigger>
                    {tourData?.enquiry && (
                        <TabsTrigger value="enquiry">Enquiry Form</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="booking" className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium mb-1">
                            Full Name <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            className="w-full p-2 border border-input rounded-md bg-background"
                            placeholder="Your full name"
                            value={bookingForm.fullName}
                            onChange={(e) => setBookingForm({ ...bookingForm, fullName: e.target.value })}
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1">
                            Email Address <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="w-full p-2 border border-input rounded-md bg-background"
                            placeholder="email@example.com"
                            value={bookingForm.email}
                            onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium mb-1">
                            Contact Number <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            className="w-full p-2 border border-input rounded-md bg-background"
                            placeholder="Your phone number"
                            value={bookingForm.phone}
                            onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                        />
                    </div>

                    <div>
                        <label htmlFor="departureDate" className="block text-sm font-medium mb-1">
                            Departure Date <span className="text-destructive">*</span>
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    defaultMonth={availableDates.length > 0 ? availableDates[0] : new Date()}
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                        if (date) {
                                            setSelectedDate(date);

                                            // Calculate end date based on tour duration
                                            const days = tourData.tourDates?.days || 1;
                                            const endDate = new Date(date);
                                            endDate.setDate(endDate.getDate() + days - 1);

                                            setDateRange({ from: date, to: endDate });

                                            const formattedDate = format(date, 'yyyy-MM-dd');
                                            setBookingForm({ ...bookingForm, departureDate: formattedDate });
                                        }
                                    }}
                                    disabled={(date) => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        date.setHours(0, 0, 0, 0);

                                        // Disable past dates
                                        if (date < today) return true;

                                        // Disable dates that are not in availableDates
                                        const isAvailable = availableDates.some(
                                            availDate => {
                                                const checkDate = new Date(availDate);
                                                checkDate.setHours(0, 0, 0, 0);
                                                return checkDate.getTime() === date.getTime();
                                            }
                                        );

                                        return !isAvailable;
                                    }}
                                    fromMonth={new Date()}
                                    toMonth={availableDates.length > 0 ? new Date(Math.max(...availableDates.map(d => d.getTime()))) : new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="adults" className="block text-sm font-medium mb-1">Adults</label>
                            <select
                                id="adults"
                                className="w-full p-2 border border-input rounded-md bg-background"
                                value={bookingForm.adults}
                                onChange={(e) => setBookingForm({ ...bookingForm, adults: parseInt(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                    <option key={num} value={num}>{num}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="children" className="block text-sm font-medium mb-1">Children</label>
                            <select
                                id="children"
                                className="w-full p-2 border border-input rounded-md bg-background"
                                value={bookingForm.children}
                                onChange={(e) => setBookingForm({ ...bookingForm, children: parseInt(e.target.value) })}
                            >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                    <option key={num} value={num}>{num}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="specialRequests" className="block text-sm font-medium mb-1">
                            Special Requests (Optional)
                        </label>
                        <textarea
                            id="specialRequests"
                            className="w-full p-2 border border-input rounded-md bg-background"
                            placeholder="Any special requirements or requests..."
                            rows={3}
                            value={bookingForm.specialRequests}
                            onChange={(e) => setBookingForm({ ...bookingForm, specialRequests: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 border-t border-border">
                        <div className="flex justify-between mb-2">
                            <span>Price per person:</span>
                            <div className="text-right">
                                {pricing.basePrice < pricing.originalPrice ? (
                                    <div>
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-sm line-through text-muted-foreground">
                                                ${formatPrice(pricing.originalPrice)}
                                            </span>
                                            <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded">
                                                -{Math.round(((pricing.originalPrice - pricing.basePrice) / pricing.originalPrice) * 100)}%
                                            </span>
                                        </div>
                                        <div className="text-lg font-bold text-green-600">
                                            ${formatPrice(pricing.basePrice)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-lg font-bold text-primary">
                                        ${formatPrice(pricing.basePrice)}
                                    </div>
                                )}
                                {tourData.pricePerPerson && (
                                    <div className="text-xs text-muted-foreground">per person</div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>Adults ({bookingForm.adults}):</span>
                            <span>${formatPrice(pricing.adultPrice)}</span>
                        </div>
                        {bookingForm.children > 0 && (
                            <div className="flex justify-between mb-2">
                                <span>Children ({bookingForm.children}):</span>
                                <span>${formatPrice(pricing.childPrice)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                            <span>Total:</span>
                            <span className="text-primary">${formatPrice(pricing.totalPrice)}</span>
                        </div>
                    </div>

                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleBookingSubmit}
                        disabled={bookingMutation.isPending}
                    >
                        {bookingMutation.isPending ? 'Processing...' : 'Book Now'}
                    </Button>
                </TabsContent>

                {tourData?.enquiry && (
                    <TabsContent value="enquiry" className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="enquiryName" className="block text-sm font-medium mb-1">
                                Full Name <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                id="enquiryName"
                                className="w-full p-2 border border-input rounded-md bg-background"
                                placeholder="Your full name"
                                value={enquiryForm.fullName}
                                onChange={(e) => setEnquiryForm({ ...enquiryForm, fullName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label htmlFor="enquiryEmail" className="block text-sm font-medium mb-1">
                                Email Address <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="email"
                                id="enquiryEmail"
                                className="w-full p-2 border border-input rounded-md bg-background"
                                placeholder="email@example.com"
                                value={enquiryForm.email}
                                onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label htmlFor="enquiryMessage" className="block text-sm font-medium mb-1">
                                Message <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                id="enquiryMessage"
                                className="w-full p-2 border border-input rounded-md bg-background"
                                placeholder="I'm interested in this tour and would like more information..."
                                rows={5}
                                value={enquiryForm.message}
                                onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                            />
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleEnquirySubmit}
                        >
                            Send Enquiry
                        </Button>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
