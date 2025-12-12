'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, Calendar, Clock, Users, ShieldCheck, CreditCard, Tag, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { BookingWizard } from '@/components/cart/BookingWizard';
import { useValidatePromoCode } from '@/lib/hooks/useBooking';
import { getCartBookings, removeFromCart, updateCartBooking, clearCart, CartBooking } from '@/lib/cartUtils';

export default function CartClient() {
    const router = useRouter();
    const [cartBookings, setCartBookings] = useState<CartBooking[]>([]);
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const validatePromoCodeMutation = useValidatePromoCode();

    useEffect(() => {
        // Load bookings from localStorage using utility function
        const bookings = getCartBookings();
        setCartBookings(bookings);
        setIsLoading(false);

        // Listen for cart updates
        const handleCartUpdate = () => {
            setCartBookings(getCartBookings());
        };

        window.addEventListener('cartUpdated', handleCartUpdate);
        return () => window.removeEventListener('cartUpdated', handleCartUpdate);
    }, []);

    const handleRemove = (bookingReference: string) => {
        removeFromCart(bookingReference);
        setCartBookings(getCartBookings());
        toast({
            title: 'Booking removed',
            description: 'The booking has been removed from your cart.',
        });
    };

    const handleUpdateParticipants = (bookingReference: string, type: 'adults' | 'children', delta: number) => {
        const updatedBookings = cartBookings.map(booking => {
            if (booking.bookingReference === bookingReference) {
                const currentCount = booking.participants[type];
                const newCount = Math.max(type === 'adults' ? 1 : 0, currentCount + delta);

                // Calculate new pricing based on participant changes
                const basePrice = booking.pricing.totalPrice / (
                    booking.participants.adults + (booking.participants.children * 0.5)
                );

                const updatedParticipants = {
                    ...booking.participants,
                    [type]: newCount
                };

                const newTotalPrice = basePrice * (
                    updatedParticipants.adults + (updatedParticipants.children * 0.5)
                );

                return {
                    ...booking,
                    participants: updatedParticipants,
                    pricing: {
                        ...booking.pricing,
                        totalPrice: Math.round(newTotalPrice)
                    }
                };
            }
            return booking;
        });

        setCartBookings(updatedBookings);
        localStorage.setItem('cartBookings', JSON.stringify(updatedBookings));
    };

    const handleClearCart = () => {
        setCartBookings([]);
        localStorage.removeItem('cartBookings');
        toast({
            title: 'Cart cleared',
            description: 'All bookings have been removed from your cart.',
        });
    };

    const applyPromoCode = () => {
        if (promoCode.toUpperCase() === 'SAVE10') {
            setDiscount(0.1);
            toast({
                title: 'Promo code applied!',
                description: '10% discount has been applied to your order.',
            });
        } else if (promoCode.toUpperCase() === 'SAVE20') {
            setDiscount(0.2);
            toast({
                title: 'Promo code applied!',
                description: '20% discount has been applied to your order.',
            });
        } else if (promoCode) {
            toast({
                title: 'Invalid promo code',
                description: 'The promo code you entered is not valid.',
                variant: 'destructive',
            });
        }
    };

    const subtotal = cartBookings.reduce((sum, booking) => sum + booking.pricing.totalPrice, 0);
    const discountAmount = subtotal * discount;
    const total = subtotal - discountAmount;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading your cart...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Booking Wizard Header */}
            <BookingWizard currentStep={0} itemCount={cartBookings.length} />

            {/* Main Cart Content */}
            <div className="container mx-auto px-4 py-8">
                {cartBookings.length > 0 ? (
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            {cartBookings.map((booking) => (
                                <Card key={booking.bookingReference} className="overflow-hidden">
                                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                                        {/* Tour Image */}
                                        <div className="relative w-full sm:w-48 h-48 sm:h-auto rounded-lg overflow-hidden flex-shrink-0">
                                            <img
                                                src={booking.tourImage}
                                                alt={booking.tourTitle}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Tour Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div>
                                                    <h3 className="text-lg font-semibold mb-1">{booking.tourTitle}</h3>
                                                    <div className="flex flex-wrap items-center gap-3 text-sm">
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <span className="font-medium">Booking Ref:</span>
                                                            <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                                                                {booking.bookingReference}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <span className="font-medium">Tour Code:</span>
                                                            <span className="font-mono bg-primary/10 px-2 py-0.5 rounded text-primary">
                                                                {booking.tourCode}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemove(booking.bookingReference)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="grid sm:grid-cols-2 gap-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{format(new Date(booking.departureDate), 'MMM dd, yyyy')}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{booking.tour?.duration || '5 Days / 4 Nights'}</span>
                                                </div>
                                            </div>

                                            {/* Participants Controls and Price */}
                                            <div className="flex flex-wrap items-end justify-between gap-4">
                                                <div className="space-y-3 flex-1">
                                                    {/* Adults Counter */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[80px]">
                                                            <Users className="w-4 h-4" />
                                                            <span>Adults:</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 border rounded-lg">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleUpdateParticipants(booking.bookingReference, 'adults', -1)}
                                                                disabled={booking.participants.adults <= 1}
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </Button>
                                                            <span className="w-8 text-center font-medium">{booking.participants.adults}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleUpdateParticipants(booking.bookingReference, 'adults', 1)}
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Children Counter */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[80px]">
                                                            <Users className="w-4 h-4" />
                                                            <span>Children:</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 border rounded-lg">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleUpdateParticipants(booking.bookingReference, 'children', -1)}
                                                                disabled={booking.participants.children <= 0}
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </Button>
                                                            <span className="w-8 text-center font-medium">{booking.participants.children}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleUpdateParticipants(booking.bookingReference, 'children', 1)}
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-sm text-muted-foreground mb-1">
                                                        Total for {booking.participants.adults + booking.participants.children} guest{(booking.participants.adults + booking.participants.children) > 1 ? 's' : ''}
                                                    </div>
                                                    <div className="text-2xl font-bold text-primary">
                                                        ${booking.pricing.totalPrice.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact Info */}
                                            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                                                Contact: {booking.contactName} • {booking.contactEmail}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}

                            {/* Promo Code Card */}
                            <Card className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Tag className="w-5 h-5 text-primary" />
                                    <h3 className="font-semibold">Have a promo code?</h3>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter promo code"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button onClick={applyPromoCode} variant="outline">
                                        Apply
                                    </Button>
                                </div>
                                {discount > 0 && (
                                    <p className="text-sm text-primary mt-2">
                                        ✓ Promo code applied - {discount * 100}% off!
                                    </p>
                                )}
                            </Card>
                        </div>

                        {/* Order Summary */}
                        <div>
                            <Card className="p-6 sticky top-8">
                                <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal ({cartBookings.length} booking{cartBookings.length > 1 ? 's' : ''})</span>
                                        <span className="font-medium text-foreground">
                                            ${subtotal.toLocaleString()}
                                        </span>
                                    </div>

                                    {discount > 0 && (
                                        <div className="flex justify-between text-primary">
                                            <span>Discount ({discount * 100}% off)</span>
                                            <span className="font-medium">-${discountAmount.toLocaleString()}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Service Fee</span>
                                        <span className="font-medium text-foreground">$0</span>
                                    </div>

                                    <div className="border-t pt-3 flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">${total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <Button size="lg" className="w-full mb-4" onClick={() => router.push('/checkout')}>
                                    <CreditCard className="w-5 h-5 mr-2" />
                                    Proceed to Checkout
                                </Button>

                                <Button variant="outline" className="w-full mb-3" onClick={() => router.push('/tours')}>
                                    Continue Shopping
                                </Button>

                                <div className="space-y-3 text-sm text-muted-foreground mb-6">
                                    <div className="flex items-start gap-2">
                                        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                        <p>
                                            <span className="font-medium text-foreground">Secure payment</span>
                                            <br />
                                            Your information is protected with 256-bit SSL encryption
                                        </p>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                        <p>
                                            <span className="font-medium text-foreground">Free cancellation</span>
                                            <br />
                                            Cancel up to 24 hours before your tour for a full refund
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={handleClearCart}
                                >
                                    Clear Cart
                                </Button>

                                <div className="mt-6 pt-6 border-t text-center text-xs text-muted-foreground">
                                    By proceeding, you agree to our{' '}
                                    <button className="underline hover:text-foreground">Terms of Service</button>
                                    {' '}and{' '}
                                    <button className="underline hover:text-foreground">Privacy Policy</button>
                                </div>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <Card className="p-12 text-center">
                        <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
                        <p className="text-muted-foreground mb-6">Add some tours to get started!</p>
                        <Button onClick={() => router.push('/tours')}>Browse Tours</Button>
                    </Card>
                )}
            </div>
        </div>
    );
}
