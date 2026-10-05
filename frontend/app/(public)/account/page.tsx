import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TravelerAccount } from '@/components/account/TravelerAccount';

export const metadata: Metadata = {
    title: 'My account',
    robots: { index: false, follow: false },
};

export default function AccountPage() {
    return (
        <Suspense fallback={<div className="py-24 text-center text-sm text-muted-foreground">Loading your account…</div>}>
            <TravelerAccount />
        </Suspense>
    );
}
