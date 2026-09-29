'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMyBusinessPartners } from '@/lib/queries';
import type { BusinessPartnerType } from '@/lib/api/businessPartners';

const TYPE_TO_PATH: Record<BusinessPartnerType, string> = {
    hotel: '/dashboard/hotels',
    guesthouse: '/dashboard/hotels',
    restaurant: '/dashboard/restaurants',
    guide: '/dashboard/guides',
    transport: '/dashboard/logistics',
    advertiser: '/dashboard/advertising',
};

/**
 * This page used to be the single shared "My Business" dashboard for every
 * business-partner type. It's now split into type-specific pages (see
 * TYPE_TO_PATH) — this redirects old links/bookmarks to the right one.
 */
export default function BusinessDashboardRedirectPage() {
    const router = useRouter();
    const { data: businesses, isLoading } = useMyBusinessPartners();

    useEffect(() => {
        if (isLoading) return;
        const target = businesses?.[0] ? TYPE_TO_PATH[businesses[0].type] : '/apply-partner';
        router.replace(target);
    }, [isLoading, businesses, router]);

    return (
        <div className="min-h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
    );
}
