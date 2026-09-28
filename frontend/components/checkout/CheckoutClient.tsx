'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckoutSteps } from '@/components/cart/CheckoutSteps';
import { toast } from '@/components/ui/use-toast';
import { useProcessPayment } from '@/lib/queries/useBooking';
import { getCartBookings, clearCart, CartBooking } from '@/lib/cartUtils';

export default function CheckoutClient() {
    const router = useRouter();
    const [paymentMethod] = useState<'card' | 'paypal'>('card');
    const [cartBookings, setCartBookings] = useState<CartBooking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [contactInfo, setContactInfo] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });

    const processPaymentMutation = useProcessPayment();

    useEffect(() => {
        // Load bookings from localStorage
        const bookings = getCartBookings();
        if (bookings.length === 0) {
            router.push('/cart');
            return;
        }
        setCartBookings(bookings);
        setIsLoading(false);
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate contact info
        if (!contactInfo.firstName || !contactInfo.lastName || !contactInfo.email || !contactInfo.phone) {
            toast({
                title: 'Missing information',
                description: 'Please fill in all contact information',
                variant: 'destructive',
            });
            return;
        }

        processPaymentMutation.mutate(
            {
                bookings: cartBookings,
                paymentMethod,
                contactInfo,
            },
            {
                onSuccess: () => {
                    // Clear cart
                    clearCart();

                    toast({
                        title: 'Payment successful!',
                        description: 'Your booking has been confirmed.',
                    });

                    router.push('/confirmation');
                },
                onError: (error: any) => {
                    toast({
                        title: 'Payment failed',
                        description: error.message || 'There was an error processing your payment. Please try again.',
                        variant: 'destructive',
                    });
                },
            }
        );
    };

    const subtotal = cartBookings.reduce((sum, booking) => sum + booking.pricing.totalPrice, 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading checkout...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Booking Wizard Header */}
            <CheckoutSteps currentStep={1} />

            {/* Main Checkout Content */}
            <div className="container mx-auto px-4 py-8">
                <form onSubmit={handleSubmit}>
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Contact Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Contact Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="firstName">First Name</Label>
                                            <Input
                                                id="firstName"
                                                required
                                                value={contactInfo.firstName}
                                                onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input
                                                id="lastName"
                                                required
                                                value={contactInfo.lastName}
                                                onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            value={contactInfo.email}
                                            onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            required
                                            value={contactInfo.phone}
                                            onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Method */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment Method</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Card numbers are not collected. This booking stays unpaid until a payment provider is connected.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Order Summary */}
                        <div>
                            <Card className="sticky top-4">
                                <CardHeader>
                                    <CardTitle>Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        {cartBookings.map((booking) => (
                                            <div key={booking.bookingReference} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground truncate mr-2">
                                                    {booking.tourTitle}
                                                </span>
                                                <span className="font-medium">
                                                    ${booking.pricing.totalPrice.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t pt-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span>Subtotal</span>
                                            <span>${subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tax (10%)</span>
                                            <span>${tax.toLocaleString()}</span>
                                        </div>
                                        <div className="border-t pt-4 flex justify-between font-bold text-lg">
                                            <span>Total</span>
                                            <span className="text-primary">${total.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        size="lg"
                                        disabled={processPaymentMutation.isPending}
                                    >
                                        {processPaymentMutation.isPending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="h-4 w-4 mr-2" />
                                                Pay Now
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-xs text-center text-muted-foreground">
                                        Your payment information is secure and encrypted
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
