/**
 * Types for app routes (pages): page props, form data, and app-specific domain types.
 */

// ─── Page props ─────────────────────────────────────────────────────────────

/** Booking confirmation page (app/booking/confirmation/[id]) */
export interface BookingConfirmationPageProps {
    params: {
        id: string;
    };
}

/** Tour detail page (app/(public)/tours/[id]) – Next.js 15 async params */
export interface TourDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

// ─── Booking / Traveler ────────────────────────────────────────────────────

/** Traveler info for booking flow (TravelerForm, BookingSummary) */
export interface TravelerInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    passportNumber?: string;
}

/** Booking form payload (FrontBooking) */
export interface BookingFormData {
    fullName: string;
    email: string;
    phone: string;
    departureDate: string;
    adults: number;
    children: number;
    specialRequests: string;
}

/** Enquiry form payload (FrontBooking) */
export interface EnquiryFormData {
    fullName: string;
    email: string;
    message: string;
}

// ─── Profile / My Bookings ─────────────────────────────────────────────────

/** Booking item for dashboard bookings page (app/dashboard/(customer)/bookings) */
export interface MyBooking {
    id: string;
    referenceNumber: string;
    tour: {
        id: string;
        title: string;
        coverImage: string;
        destination: string;
    };
    date: Date;
    status: 'upcoming' | 'past' | 'cancelled';
    travelers: number;
    totalPrice: number;
    createdAt: Date;
}

// ─── Dashboard users list ───────────────────────────────────────────────────

/** User row type for dashboard users page (app/dashboard/users) */
export interface DashboardUser {
    _id: string;
    id: string;
    name: string;
    email: string;
    phone?: string;
    roles: string;
    avatar?: string;
    createdAt?: string;
    created_at?: string;
}

// ─── Form data (dashboard pages) ────────────────────────────────────────────

/** Profile form (app/dashboard/profile) */
export interface ProfileFormData {
    name: string;
    email: string;
    phone?: string;
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    branchCode?: string;
}

/** Password change form (app/dashboard/profile) */
export interface PasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

/** User edit form (app/dashboard/users/edit/[id]) */
export interface UserFormData {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    roles?: string;
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    branchCode?: string;
}

/** Post form (app/dashboard/posts/add, app/dashboard/posts/edit/[id]) */
export interface PostFormData {
    title: string;
    content: string;
    status: 'Draft' | 'Published' | 'Archived';
    image?: string;
    tags?: string[];
    enableComments?: boolean;
}
