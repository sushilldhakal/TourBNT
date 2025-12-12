'use client';

import { useLayout } from '@/providers/LayoutProvider';
import Link from 'next/link';

export default function BookingsPage() {
    const { isFullWidth } = useLayout();

    // TODO: Fetch user bookings from API
    const bookings = [];

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">My Bookings</h1>
                <p className="text-xl text-muted-foreground">
                    View and manage your tour bookings
                </p>
            </div>

            {bookings.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-lg">
                    <p className="text-xl text-muted-foreground mb-4">You don't have any bookings yet</p>
                    <Link href="/tours" className="text-primary hover:text-primary/80">
                        Browse Tours
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Booking cards will be mapped here */}
                </div>
            )}
        </div>
    );
}
