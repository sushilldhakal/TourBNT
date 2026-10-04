import { useSyncExternalStore } from 'react';

export interface CartBooking {
    id: string;
    bookingReference: string;
    tourTitle: string;
    tourCode: string;
    tourImage: string;
    departureDate: string;
    participants: {
        adults: number;
        children: number;
    };
    pricing: {
        totalPrice: number;
        currency: string;
    };
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    specialRequests?: string;
    tour?: {
        duration?: string;
        destination?: string;
    };
}

/**
 * Generate a unique booking reference
 */
export function generateBookingReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `BK-${timestamp}-${random}`.toUpperCase();
}

/**
 * Add a booking to the cart
 */
export function addToCart(booking: CartBooking): void {
    try {
        const existingBookings = getCartBookings();
        existingBookings.push(booking);
        localStorage.setItem('cartBookings', JSON.stringify(existingBookings));

        // Dispatch custom event for same-tab updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cartUpdated'));
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        throw new Error('Failed to add booking to cart');
    }
}

/**
 * Get all bookings from the cart
 */
export function getCartBookings(): CartBooking[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem('cartBookings');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error reading cart:', error);
        return [];
    }
}

/**
 * Get the number of items in the cart
 */
export function getCartCount(): number {
    return getCartBookings().length;
}

/**
 * Remove a booking from the cart by reference
 */
export function removeFromCart(bookingReference: string): void {
    try {
        const bookings = getCartBookings();
        const updatedBookings = bookings.filter(
            booking => booking.bookingReference !== bookingReference
        );
        localStorage.setItem('cartBookings', JSON.stringify(updatedBookings));

        // Dispatch custom event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cartUpdated'));
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        throw new Error('Failed to remove booking from cart');
    }
}

/**
 * Clear all bookings from the cart
 */
export function clearCart(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('cartBookings');

    // Dispatch custom event
    window.dispatchEvent(new Event('cartUpdated'));
}

/**
 * Update a booking in the cart
 */
export function updateCartBooking(
    bookingReference: string,
    updates: Partial<CartBooking>
): void {
    try {
        const bookings = getCartBookings();
        const updatedBookings = bookings.map(booking =>
            booking.bookingReference === bookingReference
                ? { ...booking, ...updates }
                : booking
        );
        localStorage.setItem('cartBookings', JSON.stringify(updatedBookings));

        // Dispatch custom event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cartUpdated'));
        }
    } catch (error) {
        console.error('Error updating cart booking:', error);
        throw new Error('Failed to update booking in cart');
    }
}

/**
 * Calculate cart totals
 */
export function getCartTotals() {
    const bookings = getCartBookings();
    const subtotal = bookings.reduce((sum, booking) => sum + booking.pricing.totalPrice, 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    return {
        subtotal,
        tax,
        total,
        itemCount: bookings.length
    };
}

const CART_KEY = 'cartBookings';
const EMPTY_CART: CartBooking[] = [];
let cachedRaw: string | null = null;
let cachedCart: CartBooking[] = EMPTY_CART;

/** The cart as stored, parsed once per change so React sees a stable snapshot. */
function cartSnapshot(): CartBooking[] {
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(CART_KEY);
    } catch {
        return EMPTY_CART;
    }
    if (raw !== cachedRaw) {
        cachedRaw = raw;
        try {
            const parsed: unknown = raw ? JSON.parse(raw) : [];
            cachedCart = Array.isArray(parsed) ? (parsed as CartBooking[]) : EMPTY_CART;
        } catch {
            cachedCart = EMPTY_CART;
        }
    }
    return cachedCart;
}

function subscribeToCart(onChange: () => void): () => void {
    window.addEventListener('cartUpdated', onChange);
    // Other tabs.
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener('cartUpdated', onChange);
        window.removeEventListener('storage', onChange);
    };
}

/** The cart's bookings, kept in sync with localStorage (empty during server rendering). */
export function useCartBookings(): CartBooking[] {
    return useSyncExternalStore(subscribeToCart, cartSnapshot, () => EMPTY_CART);
}

/** Replace the cart's bookings. */
export function saveCart(bookings: CartBooking[]): void {
    localStorage.setItem(CART_KEY, JSON.stringify(bookings));
    window.dispatchEvent(new Event('cartUpdated'));
}
