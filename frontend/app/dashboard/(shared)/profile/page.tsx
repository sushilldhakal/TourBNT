/**
 * Profile Route Page
 *
 * Renders the profile page for account management.
 * Authentication is handled by the dashboard layout.
 */
'use client';

import { ProfilePage } from '@/components/dashboard/profile/ProfilePage';
import { BusinessProfileSection } from '@/components/dashboard/business/BusinessTypeDashboard';

export default function ProfileRoute() {
    return (
        <>
            <ProfilePage />
            {/* Business owners: the one-time listing details live here, not on the hotel/restaurant dashboards. */}
            <div className="container mx-auto px-4 pb-8 max-w-6xl">
                <BusinessProfileSection />
            </div>
        </>
    );
}
