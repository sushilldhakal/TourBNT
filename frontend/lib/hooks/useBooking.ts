import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createBooking,
    processPayment,
    getUserBookings,
    getBookingByReference,
    validatePromoCode,
    cancelBooking,
} from '../api/bookings';
import { CartBooking } from '../cartUtils';

/**
 * Hook to create a new booking
 */
export const useCreateBooking = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createBooking,
        onSuccess: () => {
            // Invalidate user bookings query to refetch
            queryClient.invalidateQueries({ queryKey: ['userBookings'] });
        },
    });
};

/**
 * Hook to process payment
 */
export const useProcessPayment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: processPayment,
        onSuccess: () => {
            // Invalidate user bookings query to refetch
            queryClient.invalidateQueries({ queryKey: ['userBookings'] });
        },
    });
};

/**
 * Hook to get user's bookings
 */
export const useUserBookings = () => {
    return useQuery({
        queryKey: ['userBookings'],
        queryFn: getUserBookings,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to get booking by reference
 */
export const useBookingByReference = (bookingReference: string, enabled = true) => {
    return useQuery({
        queryKey: ['booking', bookingReference],
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
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: cancelBooking,
        onSuccess: () => {
            // Invalidate user bookings query to refetch
            queryClient.invalidateQueries({ queryKey: ['userBookings'] });
        },
    });
};
