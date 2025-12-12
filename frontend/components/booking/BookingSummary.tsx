'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    MapPin,
    Calendar,
    Users,
    DollarSign,
    Mail,
    Phone,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface Tour {
    id: string;
    title: string;
    coverImage: string;
    destination: string;
    duration: number;
}

interface PricingOption {
    id: string;
    name: string;
    price: number;
    description: string;
}

interface TravelerInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    passportNumber?: string;
}

interface BookingSummaryProps {
    tour: Tour;
    selectedDate: Date;
    pricing: PricingOption;
    travelers: TravelerInfo[];
    totalPrice: number;
    onConfirm: () => void;
    onBack?: () => void;
    isLoading?: boolean;
}

export function BookingSummary({
    tour,
    selectedDate,
    pricing,
    travelers,
    totalPrice,
    onConfirm,
    onBack,
    isLoading = false,
}: BookingSummaryProps) {
    const primaryContact = travelers[0];
    const additionalTravelers = travelers.slice(1);

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Summary */}
            <div className="lg:col-span-2 space-y-6">
                {/* Tour Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Tour Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <div className="relative h-24 w-32 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                    src={tour.coverImage}
                                    alt={tour.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">{tour.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <MapPin className="h-4 w-4" />
                                    {tour.destination}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <Calendar className="h-4 w-4" />
                                    {tour.duration} days
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Travel Date</p>
                                <p className="text-base font-semibold">
                                    {format(selectedDate, 'MMMM d, yyyy')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Package</p>
                                <p className="text-base font-semibold">{pricing.name}</p>
                                <p className="text-sm text-muted-foreground">{pricing.description}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Travelers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Travelers ({travelers.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Primary Contact */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="default">Primary Contact</Badge>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2 text-sm">
                                <div>
                                    <p className="font-medium">
                                        {primaryContact.firstName} {primaryContact.lastName}
                                    </p>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Mail className="h-3 w-3" />
                                        {primaryContact.email}
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        {primaryContact.phone}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        DOB: {format(new Date(primaryContact.dateOfBirth), 'MMM d, yyyy')}
                                    </p>
                                    {primaryContact.passportNumber && (
                                        <p className="text-muted-foreground">
                                            Passport: {primaryContact.passportNumber}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Additional Travelers */}
                        {additionalTravelers.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Additional Travelers
                                    </p>
                                    {additionalTravelers.map((traveler, index) => (
                                        <div key={index} className="grid gap-2 md:grid-cols-2 text-sm">
                                            <div>
                                                <p className="font-medium">
                                                    {traveler.firstName} {traveler.lastName}
                                                </p>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    {traveler.email}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">
                                                    DOB: {format(new Date(traveler.dateOfBirth), 'MMM d, yyyy')}
                                                </p>
                                                {traveler.passportNumber && (
                                                    <p className="text-muted-foreground">
                                                        Passport: {traveler.passportNumber}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Important Information */}
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="pt-6">
                        <div className="flex gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-blue-900">Important Information</p>
                                <ul className="space-y-1 text-blue-800">
                                    <li>• You will receive a confirmation email with your booking voucher</li>
                                    <li>• Cancellations are free up to 48 hours before departure</li>
                                    <li>• Please arrive 30 minutes before the scheduled departure time</li>
                                    <li>• Bring a valid ID and passport (if required)</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Price Breakdown Sidebar */}
            <div className="lg:col-span-1">
                <Card className="sticky top-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Price Breakdown
                        </CardTitle>
                        <CardDescription>Review your booking costs</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {pricing.name} × {travelers.length}
                                </span>
                                <span className="font-medium">
                                    ${(pricing.price * travelers.length).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Service Fee</span>
                                <span className="font-medium">$0.00</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Taxes</span>
                                <span className="font-medium">Included</span>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total</span>
                            <span className="text-2xl font-bold text-primary">
                                ${totalPrice.toFixed(2)}
                            </span>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className="w-full"
                                size="lg"
                            >
                                {isLoading ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Confirm Booking
                                    </>
                                )}
                            </Button>
                            {onBack && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onBack}
                                    disabled={isLoading}
                                    className="w-full"
                                >
                                    Back
                                </Button>
                            )}
                        </div>

                        <p className="text-xs text-center text-muted-foreground">
                            By confirming, you agree to our terms and conditions
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
