'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useBookingById, useBookingTimeline } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { BookingTimeline } from '@/components/booking/BookingTimeline';
import { formatDate } from '@/lib/tourUtils';
import { MapPin, AlertCircle, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    confirmed: 'default',
    pending: 'secondary',
    cancelled: 'destructive',
    completed: 'outline',
};

export default function MyTripPage() {
    const params = useParams();
    const bookingId = typeof params.bookingId === 'string' ? params.bookingId : '';

    const { data: booking, isLoading: bookingLoading, error: bookingError } = useBookingById(bookingId);
    const { data: days, isLoading: timelineLoading } = useBookingTimeline(bookingId);

    if (bookingLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (bookingError || !booking) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Booking not found or you don&apos;t have access to it.
                        <Link href="/dashboard/bookings" className="ml-2 underline">Back to My Bookings</Link>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
            <Link href="/dashboard/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to My Bookings
            </Link>

            <DashboardCardHeader
                variant="compact"
                icon={MapPin}
                badge="My Trip"
                title={booking.tourTitle || booking.tour?.title || 'Your trip'}
                description={booking.bookingReference ? `Reference: ${booking.bookingReference}` : undefined}
            />

            <Card>
                <CardContent className="py-5 flex flex-wrap items-center gap-x-8 gap-y-3">
                    <div>
                        <p className="text-xs text-muted-foreground">Departure</p>
                        <p className="text-sm font-medium">{formatDate(booking.departureDate)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Travelers</p>
                        <p className="text-sm font-medium">
                            {booking.participants.adults} adult{booking.participants.adults === 1 ? '' : 's'}
                            {booking.participants.children ? `, ${booking.participants.children} child${booking.participants.children === 1 ? '' : 'ren'}` : ''}
                        </p>
                    </div>
                    {booking.pricing?.totalPrice != null && (
                        <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-sm font-medium">{booking.pricing.currency ?? ''} {booking.pricing.totalPrice}</p>
                        </div>
                    )}
                    <div className="ml-auto flex items-center gap-3">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/booking/${bookingId}/invoice`}><FileText className="h-4 w-4 mr-1.5" />Invoice</Link>
                        </Button>
                        <Badge variant={STATUS_BADGE_VARIANT[booking.status] ?? 'secondary'} className="capitalize">
                            {booking.status}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="py-5">
                    <p className="text-sm font-medium mb-4">Your day-by-day trip</p>
                    {timelineLoading ? (
                        <Skeleton className="h-64 w-full" />
                    ) : (
                        <BookingTimeline days={days ?? []} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
