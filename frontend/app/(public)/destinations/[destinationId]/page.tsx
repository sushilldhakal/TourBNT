'use client';

import { useLayout } from '@/providers/LayoutProvider';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SingleDestinationPage() {
    const { isFullWidth } = useLayout();
    const params = useParams();
    const destinationId = params.destinationId;

    // TODO: Fetch destination details and tours from API

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <Link href="/destinations" className="text-primary hover:text-primary/80 mb-6 inline-block">
                ← Back to Destinations
            </Link>

            <div className="mb-12">
                <h1 className="text-4xl font-bold mb-4">Destination Name</h1>
                <p className="text-xl text-muted-foreground">
                    Destination ID: {destinationId}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2">
                    <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
                        <div className="h-96 bg-muted flex items-center justify-center">
                            <p className="text-muted-foreground">Destination Image</p>
                        </div>
                    </div>
                    <div className="prose max-w-none">
                        <h2 className="text-2xl font-semibold mb-4">About this Destination</h2>
                        <p className="text-muted-foreground">
                            Destination description will be loaded from the API...
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="font-semibold mb-4">Quick Facts</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Country:</span>
                                <span className="font-medium">-</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Language:</span>
                                <span className="font-medium">-</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Currency:</span>
                                <span className="font-medium">-</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Best Time:</span>
                                <span className="font-medium">-</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-semibold mb-6">Tours in this Destination</h2>
                <div className="text-center py-16 bg-card border border-border rounded-lg">
                    <p className="text-muted-foreground">No tours available for this destination yet</p>
                </div>
            </div>
        </div>
    );
}
