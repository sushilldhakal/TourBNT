'use client';

import { useLayout } from '@/providers/LayoutProvider';
import Link from 'next/link';

export default function EnquiriesPage() {
    const { isFullWidth } = useLayout();

    // TODO: Fetch user enquiries from API
    const enquiries = [];

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">My Enquiries</h1>
                <p className="text-xl text-muted-foreground">
                    View and manage your tour enquiries
                </p>
            </div>

            <div className="mb-6">
                <Link
                    href="/contact"
                    className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition"
                >
                    New Enquiry
                </Link>
            </div>

            {enquiries.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-lg">
                    <p className="text-xl text-muted-foreground mb-4">You don't have any enquiries yet</p>
                    <Link href="/contact" className="text-primary hover:text-primary/80">
                        Submit an Enquiry
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Enquiry cards will be mapped here */}
                </div>
            )}
        </div>
    );
}
