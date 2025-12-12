import { Metadata } from 'next';
import ConfirmationClient from '@/components/confirmation/ConfirmationClient';

export const metadata: Metadata = {
    title: 'Booking Confirmed | Thank You',
    description: 'Your tour booking has been confirmed',
};

export default function ConfirmationPage() {
    return <ConfirmationClient />;
}
