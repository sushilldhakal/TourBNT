import { Metadata } from 'next';
import CheckoutClient from '@/components/checkout/CheckoutClient';

export const metadata: Metadata = {
    title: 'Checkout | Complete Your Booking',
    description: 'Complete your tour booking with secure payment',
};

export default function CheckoutPage() {
    return <CheckoutClient />;
}
