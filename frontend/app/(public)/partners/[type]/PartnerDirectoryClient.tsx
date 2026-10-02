'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLayout } from '@/providers/LayoutProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Star } from 'lucide-react';
import { searchBusinessPartners, BusinessPartnerType } from '@/lib/api/businessPartners';
import { notFound } from 'next/navigation';

const TYPE_LABELS: Record<string, string> = {
    guide: 'Tour Guides',
    hotel: 'Hotels',
    guesthouse: 'Guesthouses',
    restaurant: 'Restaurants',
    transport: 'Transport & Logistics',
    advertiser: 'Advertisers',
};

export function PartnerDirectoryClient() {
    const { type } = useParams<{ type: string }>();
    const { isFullWidth } = useLayout();
    const [q, setQ] = useState('');

    if (!TYPE_LABELS[type]) {
        notFound();
    }

    const { data, isLoading } = useQuery({
        queryKey: ['partners-directory', type, q],
        queryFn: () => searchBusinessPartners({ type: type as BusinessPartnerType, q: q || undefined, limit: 24 }),
    });

    const partners = data?.data ?? [];

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-12 transition-all duration-300`}>
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{TYPE_LABELS[type]}</h1>
                    <p className="text-muted-foreground">Verified {TYPE_LABELS[type].toLowerCase()} on TourBNT, reviewed by real travelers.</p>
                </div>
                <Input placeholder="Search by name..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            </div>

            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && partners.length === 0 && (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No {TYPE_LABELS[type].toLowerCase()} found yet.</CardContent></Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map((partner) => (
                    <Link key={partner.id} href={`/partners/${type}/${partner.slug}`}>
                        <Card className="h-full hover:shadow-md transition overflow-hidden">
                            {partner.coverImage && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={partner.coverImage} alt={partner.name} className="w-full h-36 object-cover" />
                            )}
                            <CardContent className="pt-4">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold">{partner.name}</h3>
                                    <Badge variant="secondary" className="shrink-0 capitalize">{partner.type}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{partner.description}</p>
                                <div className="flex items-center gap-1 mt-2 text-sm">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span>{partner.averageRating.toFixed(1)}</span>
                                    <span className="text-muted-foreground">({partner.approvedReviewCount} reviews)</span>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
