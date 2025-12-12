import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircle2,
    Download,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Users,
    ArrowRight,
    Home,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

interface BookingConfirmationPageProps {
    params: {
        id: string;
    };
}

// This would normally fetch from API
async function getBooking(id: string) {
    // TODO: Replace with actual API call
    // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${id}`);
    // if (!response.ok) return null;
    // return response.json();

    // Mock data for now
    return {
        id,
        referenceNumber: `BK-${id.toUpperCase()}`,
        status: 'confirmed',
        tour: {
            id: '1',
            title: 'Amazing Mountain Trek',
            coverImage: '/images/tours/default.jpg',
            destination: 'Swiss Alps',
            duration: 7,
        },
        date: new Date('2024-06-15'),
        pricing: {
            name: 'Premium Package',
            price: 499,
        },
        travelers: [
            {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1 (555) 123-4567',
            },
        ],
        totalPrice: 499,
        createdAt: new Date(),
    };
}

export default async function BookingConfirmationPage({
    params,
}: BookingConfirmationPageProps) {
    const booking = await getBooking(params.id);

    if (!booking) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-background">
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Success Header */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-green-900">Booking Confirmed!</h1>
                            <p className="text-lg text-muted-foreground mt-2">
                                Your adventure awaits
                            </p>
                        </div>
                    </div>

                    {/* Booking Reference */}
                    <Card className="border-green-200 bg-green-50/50">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <p className="text-sm font-medium text-green-900">
                                    Booking Reference Number
                                </p>
                                <p className="text-3xl font-bold text-green-700">
                                    {booking.referenceNumber}
                                </p>
                                <p className="text-sm text-green-800">
                                    Please save this reference number for your records
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Booking Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                Booking Details
                            </CardTitle>
                            <CardDescription>
                                Confirmation sent to {booking.travelers[0].email}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Tour Info */}
                            <div className="flex gap-4">
                                <div className="relative h-24 w-32 rounded-lg overflow-hidden flex-shrink-0">
                                    <Image
                                        src={booking.tour.coverImage}
                                        alt={booking.tour.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{booking.tour.title}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                        <MapPin className="h-4 w-4" />
                                        {booking.tour.destination}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                        <Calendar className="h-4 w-4" />
                                        {booking.tour.duration} days
                                    </div>
                                </div>
                                <Badge variant="default" className="h-fit">
                                    {booking.status}
                                </Badge>
                            </div>

                            <Separator />

                            {/* Key Information */}
                            <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Travel Date</p>
                                    <p className="text-base font-semibold">
                                        {format(booking.date, 'MMMM d, yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Package</p>
                                    <p className="text-base font-semibold">{booking.pricing.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Travelers</p>
                                    <p className="text-base font-semibold flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        {booking.travelers.length}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {/* Primary Contact */}
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                    Primary Contact
                                </p>
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        {booking.travelers[0].firstName} {booking.travelers[0].lastName}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        {booking.travelers[0].email}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        {booking.travelers[0].phone}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Total Price */}
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold">Total Paid</span>
                                <span className="text-2xl font-bold text-primary">
                                    ${booking.totalPrice.toFixed(2)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Button size="lg" className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            Download Voucher
                        </Button>
                        <Button size="lg" variant="outline" className="w-full" asChild>
                            <Link href="/profile/bookings">
                                View My Bookings
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    </div>

                    {/* Next Steps */}
                    <Card>
                        <CardHeader>
                            <CardTitle>What's Next?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-primary">1</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">Check Your Email</p>
                                        <p className="text-sm text-muted-foreground">
                                            We've sent a confirmation email with your booking voucher and detailed itinerary
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-primary">2</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">Prepare for Your Trip</p>
                                        <p className="text-sm text-muted-foreground">
                                            Review the packing list and travel requirements in your confirmation email
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-primary">3</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">Arrive on Time</p>
                                        <p className="text-sm text-muted-foreground">
                                            Please arrive 30 minutes before departure with your voucher and valid ID
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Support */}
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <p className="font-medium text-blue-900">Need Help?</p>
                                <p className="text-sm text-blue-800">
                                    Our support team is here to assist you 24/7
                                </p>
                                <div className="flex gap-2 justify-center pt-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="mailto:support@example.com">
                                            <Mail className="h-4 w-4 mr-2" />
                                            Email Support
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="tel:+15551234567">
                                            <Phone className="h-4 w-4 mr-2" />
                                            Call Us
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Return Home */}
                    <div className="text-center">
                        <Button variant="ghost" asChild>
                            <Link href="/">
                                <Home className="h-4 w-4 mr-2" />
                                Return to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
