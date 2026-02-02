import { useMutation, useQuery } from '@tanstack/react-query';
import {
    createBooking,
    processPayment,
    getUserBookings,
    getBookingByReference,
    validatePromoCode,
    cancelBooking,
} from '@/lib/api/bookings';
import { queryKeys } from './queryKeys';
import { useCacheManager } from './cacheUtils';

/**
 * Hook to create a new booking
 */
export const useCreateBooking = () => {
    const cache = useCacheManager();

    return useMutation({
        mutationFn: createBooking,
        onSuccess: () => {
            cache.invalidateBookings();
        },
    });
};

/**
 * Hook to process payment
 */
export const useProcessPayment = () => {
    const cache = useCacheManager();

    return useMutation({
        mutationFn: processPayment,
        onSuccess: () => {
            cache.invalidateBookings();
        },
    });
};

/**
 * Hook to get user's bookings
 */
export const useUserBookings = () => {
    return useQuery({
        queryKey: queryKeys.bookings.all(),
        queryFn: getUserBookings,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to get booking by reference
 */
export const useBookingByReference = (bookingReference: string, enabled = true) => {
    return useQuery({
        queryKey: queryKeys.bookings.detail(bookingReference),
        queryFn: () => getBookingByReference(bookingReference),
        enabled: enabled && !!bookingReference,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to validate promo code
 */
export const useValidatePromoCode = () => {
    return useMutation({
        mutationFn: validatePromoCode,
    });
};

/**
 * Hook to cancel a booking
 */
export const useCancelBooking = () => {
    const cache = useCacheManager();

    return useMutation({
        mutationFn: cancelBooking,
        onSuccess: () => {
            cache.invalidateBookings();
        },
    });
};
