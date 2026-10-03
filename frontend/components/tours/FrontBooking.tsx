'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createBooking, quoteBooking, BookingData, type QuotedPricing } from '@/lib/api/bookings';
import { createConversation } from '@/lib/api/conversations';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Tour } from '@/types/types';
import type { PriceableOption } from '@/lib/tourUtils';
import {
    generateDepartureInstances,
    calculateDeparturePrice,
    calculateBookingPricingPreview,
    BookingPaymentType,
} from '@/lib/tourUtils';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

/** The tour fields the booking form uses; both frontend Tour shapes satisfy it. */
type BookableTour = Pick<Tour, 'id' | 'title' | 'code' | 'price' | 'salePrice' | 'saleEnabled' | 'pricePerPerson' | 'paymentOptions' | 'tourDates' | 'enquiry'> & {
    coverImage?: string | null;
    pricingOptions?: PriceableOption[];
};

interface FrontBookingProps {
    tourData: BookableTour;
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
    const { isAuthenticated, isHydrated } = useAuth();

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
    const [enquirySubmitting, setEnquirySubmitting] = useState(false);

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(prefilledDate);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();

    // Which payment policies this tour actually offers. Legacy tours with no
    // paymentOptions configured default to full-payment-only (matches the
    // server's DEFAULT_PAYMENT_OPTIONS fallback).
    const paymentOptions = tourData.paymentOptions || {
        fullPaymentEnabled: true,
        depositEnabled: false,
        depositPercentage: 20,
        payOnArrivalEnabled: false,
    };

    const availablePaymentTypes = useMemo(() => {
        const types: { value: BookingPaymentType; label: string }[] = [];
        if (paymentOptions.fullPaymentEnabled) types.push({ value: 'full_payment', label: 'Pay in full now' });
        if (paymentOptions.depositEnabled) types.push({ value: 'deposit_percentage', label: `Pay ${paymentOptions.depositPercentage}% deposit now` });
        if (paymentOptions.payOnArrivalEnabled) types.push({ value: 'pay_on_arrival', label: 'Pay on arrival' });
        return types.length > 0 ? types : [{ value: 'full_payment' as BookingPaymentType, label: 'Pay in full now' }];
    }, [paymentOptions.fullPaymentEnabled, paymentOptions.depositEnabled, paymentOptions.depositPercentage, paymentOptions.payOnArrivalEnabled]);

    const [paymentType, setPaymentType] = useState<BookingPaymentType>(availablePaymentTypes[0].value);

    // If the available options change (tour data loads/changes) and the
    // currently selected type is no longer offered, fall back to the first one.
    useEffect(() => {
        if (!availablePaymentTypes.some(opt => opt.value === paymentType)) {
            setPaymentType(availablePaymentTypes[0].value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availablePaymentTypes]);

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
                    tourData.price ?? 0,
                    tourData.salePrice,
                    tourData.saleEnabled,
                    tourData.pricingOptions
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

    // Calculate pricing — mirrors the server's authoritative calculation
    // (server/src/api/bookings/utils/pricingCalculator.ts) so what the
    // traveler sees here matches what they're actually charged. Uses each
    // pricing-option category's own price/discount instead of a hardcoded
    // child discount, and respects flat/group pricing (pricePerPerson=false).
    const pricing = useMemo(() => {
        const preview = calculateBookingPricingPreview(
            // Tour.discount's declared type is a generic {type,value} shape that
            // doesn't reflect the actual discountEnabled/discountPrice/... object
            // the API returns (see server schema) — cast to the real runtime shape.
            tourData as unknown as Parameters<typeof calculateBookingPricingPreview>[0],
            { adults: bookingForm.adults, children: bookingForm.children, infants: 0 },
            paymentType
        );

        // originalPrice (pre-discount) is still useful for the "was $X" strike-through display.
        let originalPrice = tourData.price || 0;
        if (selectedDate) {
            const dateKey = format(selectedDate, 'yyyy-MM-dd');
            const priceInfo = datePriceMap.get(dateKey);
            if (priceInfo) originalPrice = priceInfo.price;
        }

        return { ...preview, originalPrice };
    }, [tourData, bookingForm.adults, bookingForm.children, paymentType, selectedDate, datePriceMap]);

    // Format price
    const formatPrice = (price: number): string => {
        return price.toFixed(2);
    };

    // ---- promo code -------------------------------------------------------------------------------
    // The server prices the booking, so a code is checked there (POST /bookings/quote) and the summary shows
    // exactly what will be charged. The quote refreshes if travellers or payment option change, since a
    // percentage code is worth a different amount.
    const [promoInput, setPromoInput] = useState('');
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [promoQuote, setPromoQuote] = useState<QuotedPricing | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [promoChecking, setPromoChecking] = useState(false);

    const quoteWithCode = async (code: string) => {
        return quoteBooking({
            tourId: tourData.id,
            participants: { adults: bookingForm.adults, children: bookingForm.children, infants: 0 },
            paymentType,
            promoCode: code,
        });
    };

    const applyPromo = async () => {
        const code = promoInput.trim();
        if (!code) return;
        setPromoChecking(true);
        setPromoError(null);
        try {
            const quote = await quoteWithCode(code);
            if (!quote.promo) throw new Error('This promo code is not valid.');
            setAppliedCode(quote.promo.code);
            setPromoQuote(quote);
            setPromoInput('');
        } catch (err) {
            setPromoError((err as Error).message);
        } finally {
            setPromoChecking(false);
        }
    };

    const removePromo = () => {
        setAppliedCode(null);
        setPromoQuote(null);
        setPromoError(null);
    };

    // Keep the applied code's amount right when the booking changes underneath it.
    useEffect(() => {
        if (!appliedCode) return;
        let cancelled = false;
        quoteWithCode(appliedCode)
            .then((q) => { if (!cancelled) setPromoQuote(q); })
            .catch((err) => { if (!cancelled) { setPromoError((err as Error).message); removePromo(); } });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appliedCode, bookingForm.adults, bookingForm.children, paymentType]);

    // What the summary shows: the server's quote when a code is applied, otherwise the local preview.
    const summary = promoQuote?.promo ? { ...pricing, ...promoQuote } : pricing;

    // Booking mutation
    const bookingMutation = useMutation({
        mutationFn: (bookingData: BookingData) => createBooking(bookingData),
        onSuccess: (response: any) => {
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

        // Prepare booking data. `tourId`/`contactInfo` must match exactly what
        // the server's createBooking controller reads from req.body — pricing
        // is intentionally NOT sent, since the server always recomputes it
        // authoritatively from the tour's own configuration.
        const bookingData: BookingData = {
            tourId: tourData.id,
            tourTitle: tourData.title,
            tourCode: tourData.code || `TOUR-${tourData.id.slice(-8).toUpperCase()}`,
            departureDate: bookingForm.departureDate,
            participants: {
                adults: bookingForm.adults,
                children: bookingForm.children,
                infants: 0,
            },
            paymentType,
            promoCode: appliedCode ?? undefined,
            contactInfo: {
                fullName: bookingForm.fullName,
                email: bookingForm.email,
                phone: bookingForm.phone,
            },
            specialRequests: bookingForm.specialRequests,
        };

        bookingMutation.mutate(bookingData);
    };

    // Enquiry: only for logged-in users; we only collect message (name/email from account)
    const handleEnquirySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) return;
        if (!enquiryForm.message?.trim()) {
            toast({
                title: "Message required",
                description: "Please enter your enquiry message",
                variant: "destructive",
            });
            return;
        }

        setEnquirySubmitting(true);
        try {
            await createConversation({
                type: 'enquiry',
                subject: tourData?.title ? `Enquiry: ${tourData.title}` : 'Tour Enquiry',
                message: enquiryForm.message.trim(),
                tourId: tourData?.id,
            });
            toast({
                title: "Enquiry Sent!",
                description: "We'll reply soon. You can check replies in My Enquiries.",
                action: (
                    <ToastAction altText="View my enquiries" onClick={() => router.push('/enquiry')}>
                        View My Enquiries
                    </ToastAction>
                ),
            });
            setEnquiryForm((prev) => ({ ...prev, message: '' }));
        } catch (err: unknown) {
            const msg = (err as { message?: string })?.message ?? 'Failed to send enquiry';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setEnquirySubmitting(false);
        }
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
                            <PopoverContent className="w-max !animate-none p-0" style={{ width: "max-content", padding: 0, animation: "none" }} align="start">
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

                    {availablePaymentTypes.length > 1 && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Payment Option</label>
                            <RadioGroup
                                value={paymentType}
                                onValueChange={(value) => setPaymentType(value as BookingPaymentType)}
                                className="space-y-2"
                            >
                                {availablePaymentTypes.map((opt) => (
                                    <div key={opt.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={opt.value} id={`payment-${opt.value}`} />
                                        <Label htmlFor={`payment-${opt.value}`} className="font-normal cursor-pointer">
                                            {opt.label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    )}

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
                        {promoQuote?.promo && (
                            <div className="flex justify-between mb-2 text-green-600">
                                <span>Promo {promoQuote.promo.code}:</span>
                                <span>-${formatPrice(promoQuote.promo.amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                            <span>Total:</span>
                            <span className="text-primary">${formatPrice(summary.totalPrice)}</span>
                        </div>
                        {paymentType !== 'full_payment' && (
                            <div className="mt-2 pt-2 border-t border-dashed border-border space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span>Due now{pricing.depositPercentage ? ` (${pricing.depositPercentage}%)` : ''}:</span>
                                    <span className="font-semibold">${formatPrice(summary.amountDueNow)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Due later:</span>
                                    <span>${formatPrice(summary.amountDueLater)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Promo code */}
                    <div className="space-y-2">
                        {appliedCode ? (
                            <div className="flex items-center justify-between rounded-md border border-green-600/40 bg-green-600/10 px-3 py-2 text-sm">
                                <span>
                                    <strong>{appliedCode}</strong> applied
                                    {promoQuote?.promo ? ` — you save $${formatPrice(promoQuote.promo.amount)}` : ''}
                                </span>
                                <button type="button" onClick={removePromo} className="text-xs underline text-muted-foreground hover:text-foreground">Remove</button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={promoInput}
                                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void applyPromo(); } }}
                                    placeholder="Promo code"
                                    aria-label="Promo code"
                                    maxLength={32}
                                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm uppercase placeholder:normal-case"
                                />
                                <Button type="button" variant="outline" onClick={applyPromo} disabled={promoChecking || !promoInput.trim()}>
                                    {promoChecking ? 'Checking…' : 'Apply'}
                                </Button>
                            </div>
                        )}
                        {promoError && <p className="text-sm text-destructive" role="alert">{promoError}</p>}
                        <p className="text-xs text-muted-foreground">Prices are set and charged in US dollars.</p>
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
                        {!isHydrated ? (
                            <div className="py-6 text-center text-muted-foreground">Loading...</div>
                        ) : !isAuthenticated ? (
                            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center space-y-4">
                                <p className="text-muted-foreground">
                                    Please sign in or sign up to send an enquiry about this tour.
                                </p>
                                <div className="flex flex-wrap gap-3 justify-center">
                                    <Button asChild variant="default">
                                        <Link href="/auth/login">Sign in</Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="/auth/signup">Sign up</Link>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label htmlFor="enquiryMessage" className="block text-sm font-medium mb-1">
                                        Your message <span className="text-destructive">*</span>
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
                                    type="button"
                                    className="w-full"
                                    size="lg"
                                    disabled={enquirySubmitting || !enquiryForm.message?.trim()}
                                    onClick={handleEnquirySubmit}
                                >
                                    {enquirySubmitting ? 'Sending...' : 'Send Enquiry'}
                                </Button>

                                <div className="pt-2 text-center">
                                    <Button asChild variant="link" className="text-sm">
                                        <Link href="/enquiry">View my previous enquiries and replies</Link>
                                    </Button>
                                </div>
                            </>
                        )}
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
