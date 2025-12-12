'use client';

import { useLayout } from '@/providers/LayoutProvider';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SingleBookingPage() {
    const { isFullWidth } = useLayout();
    const params = useParams();
    const bookingId = params.bookingId;

    // TODO: Fetch booking details from API

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <Link href="/booking" className="text-primary hover:text-primary/80 mb-6 inline-block">
                ← Back to Bookings
            </Link>

            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">Booking Details</h1>
                    <p className="text-muted-foreground">Booking ID: {bookingId}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Tour Information</h2>
                            <p className="text-muted-foreground">Tour details will be loaded from the API...</p>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Traveler Information</h2>
                            <p className="text-muted-foreground">Traveler details will be loaded from the API...</p>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
                            <h3 className="font-semibold mb-4">Booking Summary</h3>
                            <div className="space-y-3 text-sm mb-6">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="font-medium text-primary">Confirmed</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium">-</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Guests:</span>
                                    <span className="font-medium">-</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-border">
                                    <span className="font-semibold">Total:</span>
                                    <span className="font-semibold text-primary">$0</span>
                                </div>
                            </div>
                            <button className="w-full border border-destructive text-destructive py-2 rounded-lg hover:bg-destructive hover:text-white transition">
                                Cancel Booking
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
