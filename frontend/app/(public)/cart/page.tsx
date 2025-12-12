import { Metadata } from 'next';
import CartClient from '@/components/cart/CartClient';

export const metadata: Metadata = {
    title: 'Shopping Cart | Your Travel Bookings',
    description: 'Review your tour bookings and proceed to checkout',
};

export default function CartPage() {
    return <CartClient />;
}
