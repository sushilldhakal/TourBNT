import type { Metadata } from 'next';
import UnsubscribeClient from '@/components/newsletter/UnsubscribeClient';

export const metadata: Metadata = {
    title: 'Unsubscribe | TourBNT',
    description: 'Stop receiving the TourBNT newsletter.',
    robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
    const { token } = await searchParams;
    return <UnsubscribeClient token={typeof token === 'string' ? token : ''} />;
}
