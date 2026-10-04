'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserBookings } from '@/lib/api/bookings';

interface BookingItem {
    id?: string;
    _id?: string;
    reference?: string;
    tourId?: { title?: string; code?: string };
    tourTitle?: string;
    departureDate?: string;
    status?: string;
    totalPrice?: number;
    createdAt?: string;
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<BookingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getUserBookings({ limit: 50 })
            .then((raw) => {
                if (cancelled) return;
                const res = raw as { data?: BookingItem[]; items?: BookingItem[]; bookings?: BookingItem[] } | undefined;
                const list = res?.data ?? res?.items ?? res?.bookings ?? [];
                setBookings(Array.isArray(list) ? list : []);
                setAuthError(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setBookings([]);
                    setAuthError(true);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">My Bookings</h1>
                <p className="text-xl text-muted-foreground">
                    View and manage your tour bookings
                </p>
            </div>

            {authError ? (
                <div className="text-center py-16 bg-card border border-border rounded-lg">
                    <p className="text-xl text-muted-foreground mb-4">Sign in to view your bookings</p>
                    <Link href="/auth/login?redirect=/booking" className="text-primary hover:text-primary/80">
                        Sign in
                    </Link>
                    <span className="text-muted-foreground mx-2">or</span>
                    <Link href="/tours" className="text-primary hover:text-primary/80">
                        Browse Tours
                    </Link>
                </div>
            ) : loading ? (
                <div className="text-center py-16 text-muted-foreground">Loading...</div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-lg">
                    <p className="text-xl text-muted-foreground mb-4">You don&apos;t have any bookings yet</p>
                    <Link href="/tours" className="text-primary hover:text-primary/80">
                        Browse Tours
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((b) => {
                        const id = (b as { id?: string }).id ?? (b as { _id?: string })._id ?? '';
                        const title = (b as { tourTitle?: string }).tourTitle ?? (b.tourId && typeof b.tourId === 'object' && 'title' in b.tourId ? (b.tourId as { title?: string }).title : undefined) ?? 'Tour';
                        return (
                            <Link
                                key={id}
                                href={`/booking/${id}`}
                                className="block bg-card border border-border rounded-lg p-6 hover:shadow-md transition"
                            >
                                <div className="flex flex-wrap justify-between items-start gap-4">
                                    <div>
                                        <h2 className="font-semibold text-lg">{title}</h2>
                                        {(b.reference || id) && (
                                            <p className="text-sm text-muted-foreground">
                                                Ref: {b.reference ?? id}
                                            </p>
                                        )}
                                        {b.departureDate && (
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(b.departureDate).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {b.status && (
                                            <span className="inline-block px-2 py-1 rounded text-sm bg-muted">
                                                {b.status}
                                            </span>
                                        )}
                                        {b.totalPrice != null && (
                                            <p className="font-semibold text-primary mt-1">
                                                ${Number(b.totalPrice).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
