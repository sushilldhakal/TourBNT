'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getBookingById, cancelBooking } from '@/lib/api/bookings';

interface BookingDetail {
    id?: string;
    _id?: string;
    reference?: string;
    status?: string;
    tourId?: { _id?: string; title?: string; code?: string };
    tourTitle?: string;
    departureDate?: string;
    participants?: { adults?: number; children?: number };
    pricing?: { totalPrice?: number; currency?: string };
    contactInfo?: { fullName?: string; email?: string; phone?: string };
    specialRequests?: string;
    createdAt?: string;
}

export default function SingleBookingPage() {
    const params = useParams();
    const bookingId = typeof params.bookingId === 'string' ? params.bookingId : '';
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        getBookingById(bookingId)
            .then((data: BookingDetail) => {
                if (!cancelled) setBooking(data);
            })
            .catch(() => {
                if (!cancelled) setError('Booking not found or you don’t have access.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [bookingId]);

    const handleCancel = async () => {
        if (!bookingId || !confirm('Are you sure you want to cancel this booking?')) return;
        setCancelling(true);
        try {
            await cancelBooking(bookingId);
            setBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
        } catch {
            setError('Failed to cancel booking.');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center text-muted-foreground">Loading...</div>
            </div>
        );
    }
    if (error || !booking) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-muted-foreground mb-4">{error ?? 'Booking not found'}</p>
                    <Link href="/booking" className="text-primary hover:text-primary/80">← Back to Bookings</Link>
                </div>
            </div>
        );
    }

    const title = (booking as { tourTitle?: string }).tourTitle ?? (booking.tourId && typeof booking.tourId === 'object' && 'title' in booking.tourId ? (booking.tourId as { title?: string }).title : undefined) ?? 'Tour';
    const total = booking.pricing?.totalPrice;
    const guests = booking.participants
        ? (Number(booking.participants.adults ?? 0) + Number(booking.participants.children ?? 0))
        : null;
    const canCancel = booking.status !== 'cancelled';

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <Link href="/booking" className="text-primary hover:text-primary/80 mb-6 inline-block">
                ← Back to Bookings
            </Link>

            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">Booking Details</h1>
                    <p className="text-muted-foreground">
                        {booking.reference ? `Ref: ${booking.reference}` : `ID: ${(booking as { id?: string }).id ?? (booking as { _id?: string })._id}`}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Tour Information</h2>
                            <p className="font-medium">{title}</p>
                            {booking.departureDate && (
                                <p className="text-muted-foreground text-sm mt-1">
                                    Departure: {new Date(booking.departureDate).toLocaleDateString()}
                                </p>
                            )}
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Traveler Information</h2>
                            {booking.contactInfo && (
                                <div className="space-y-1 text-sm">
                                    {booking.contactInfo.fullName && <p><span className="text-muted-foreground">Name:</span> {booking.contactInfo.fullName}</p>}
                                    {booking.contactInfo.email && <p><span className="text-muted-foreground">Email:</span> {booking.contactInfo.email}</p>}
                                    {booking.contactInfo.phone && <p><span className="text-muted-foreground">Phone:</span> {booking.contactInfo.phone}</p>}
                                </div>
                            )}
                            {booking.specialRequests && (
                                <p className="text-muted-foreground text-sm mt-2">{booking.specialRequests}</p>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
                            <h3 className="font-semibold mb-4">Booking Summary</h3>
                            <div className="space-y-3 text-sm mb-6">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="font-medium">{booking.status ?? '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium">
                                        {booking.departureDate ? new Date(booking.departureDate).toLocaleDateString() : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Guests:</span>
                                    <span className="font-medium">{guests ?? '-'}</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-border">
                                    <span className="font-semibold">Total:</span>
                                    <span className="font-semibold text-primary">
                                        {total != null ? `${booking.pricing?.currency ?? '$'}${Number(total).toLocaleString()}` : '-'}
                                    </span>
                                </div>
                            </div>
                            {canCancel && (
                                <button
                                    type="button"
                                    disabled={cancelling}
                                    onClick={handleCancel}
                                    className="w-full border border-destructive text-destructive py-2 rounded-lg hover:bg-destructive hover:text-white transition disabled:opacity-70"
                                >
                                    {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
