'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Mail, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookingWizard } from '@/components/cart/BookingWizard';

export default function ConfirmationClient() {
    const router = useRouter();

    useEffect(() => {
        // Optional: Send confirmation email or analytics event
    }, []);

    return (
        <div className="min-h-screen bg-background">
            {/* Booking Wizard Header */}
            <BookingWizard currentStep={2} />

            {/* Main Confirmation Content */}
            <div className="container mx-auto px-4 py-12">
                <Card className="max-w-2xl mx-auto p-8 text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-12 h-12 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
                        <p className="text-muted-foreground text-lg">
                            Thank you for your booking. We've sent a confirmation email with all the details.
                        </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6 mb-6">
                        <div className="grid gap-4 text-left">
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium">Confirmation Email Sent</p>
                                    <p className="text-sm text-muted-foreground">
                                        Check your inbox for booking details and next steps
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium">Add to Calendar</p>
                                    <p className="text-sm text-muted-foreground">
                                        Don't forget to mark your tour dates
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Download className="w-5 h-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium">Download Voucher</p>
                                    <p className="text-sm text-muted-foreground">
                                        Present this at the tour meeting point
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button size="lg" onClick={() => router.push('/tours')}>
                            Browse More Tours
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => router.push('/')}>
                            Back to Home
                        </Button>
                    </div>

                    <p className="text-sm text-muted-foreground mt-6">
                        Need help? Contact our support team at{' '}
                        <a href="mailto:support@example.com" className="text-primary hover:underline">
                            support@example.com
                        </a>
                    </p>
                </Card>
            </div>
        </div>
    );
}
