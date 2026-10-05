import { redirect } from 'next/navigation';

/** Travellers manage bookings on their account page, not in the operator dashboard. */
export default function MyBookingsPage() {
    redirect('/account?tab=bookings');
}
