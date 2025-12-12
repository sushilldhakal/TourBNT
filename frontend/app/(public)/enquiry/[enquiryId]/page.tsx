'use client';

import { useLayout } from '@/providers/LayoutProvider';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SingleEnquiryPage() {
    const { isFullWidth } = useLayout();
    const params = useParams();
    const enquiryId = params.enquiryId;

    // TODO: Fetch enquiry details from API

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <Link href="/enquiry" className="text-primary hover:text-primary/80 mb-6 inline-block">
                ← Back to Enquiries
            </Link>

            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">Enquiry Details</h1>
                    <p className="text-muted-foreground">Enquiry ID: {enquiryId}</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-semibold mb-2">Subject</h2>
                                <p className="text-muted-foreground">Enquiry subject will be loaded from the API...</p>
                            </div>
                            <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                                Pending
                            </span>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Submitted:</span>
                                <span className="font-medium">-</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="font-medium">Pending</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="font-semibold mb-4">Message</h3>
                        <p className="text-muted-foreground">
                            Enquiry message will be loaded from the API...
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="font-semibold mb-4">Response</h3>
                        <p className="text-muted-foreground">
                            No response yet. We'll get back to you soon!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
