'use client';

import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLayout } from '@/providers/LayoutProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Globe, Mail, Phone } from 'lucide-react';
import { getBusinessPartnerBySlug, getToursFeaturingBusinessPartner } from '@/lib/api/businessPartners';
import { BusinessReviewSystem } from '@/components/business/BusinessReviewSystem';
import { RelevantAdSlot } from '@/components/ads/RelevantAdSlot';

export default function BusinessPartnerProfilePage() {
    const { slug } = useParams<{ slug: string }>();
    const { isFullWidth } = useLayout();

    const { data: business, isLoading, isError } = useQuery({
        queryKey: ['business-partner', slug],
        queryFn: () => getBusinessPartnerBySlug(slug),
        retry: false,
    });

    const { data: tours } = useQuery({
        queryKey: ['business-partner-tours', business?.id],
        queryFn: () => getToursFeaturingBusinessPartner(business!.id),
        enabled: !!business?.id,
    });

    if (isLoading) {
        return <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 text-center text-muted-foreground`}>Loading...</div>;
    }
    if (isError || !business) {
        notFound();
    }

    return (
        <div className="transition-all duration-300">
            <div className="relative h-56 md:h-72 bg-muted overflow-hidden">
                {business.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={business.coverImage} alt={business.name} className="w-full h-full object-cover" />
                )}
            </div>

            <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 -mt-12 relative`}>
                <Card>
                    <CardContent className="pt-6 flex flex-col md:flex-row md:items-center gap-4">
                        {business.logo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={business.logo} alt={business.name} className="w-20 h-20 rounded-lg object-cover border border-border shrink-0" />
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-bold">{business.name}</h1>
                                <Badge variant="secondary" className="capitalize">{business.type}</Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-sm">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{business.averageRating.toFixed(1)}</span>
                                <span className="text-muted-foreground">({business.approvedReviewCount} reviews)</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            {business.website && (
                                <a href={business.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary">
                                    <Globe className="h-4 w-4" /> Website
                                </a>
                            )}
                            {business.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {business.email}</div>}
                            {business.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {business.phone}</div>}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pb-16">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardContent className="pt-6">
                                <h2 className="text-xl font-semibold mb-3">About</h2>
                                <p className="text-muted-foreground whitespace-pre-line">{business.description}</p>
                            </CardContent>
                        </Card>
                        <BusinessReviewSystem businessPartnerId={business.id} />
                    </div>

                    <div>
                        <Card>
                            <CardContent className="pt-6">
                                <h2 className="text-lg font-semibold mb-3">Tours featuring {business.name}</h2>
                                {(!tours || tours.length === 0) && <p className="text-sm text-muted-foreground">Not featured in any published tours yet.</p>}
                                <div className="space-y-3">
                                    {tours?.map((tour) => (
                                        <Link key={tour.id} href={`/tours/${tour.id}`} className="flex gap-3 group">
                                            {tour.coverImage && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={tour.coverImage} alt={tour.title} className="w-16 h-16 object-cover rounded-md shrink-0" />
                                            )}
                                            <div>
                                                <div className="text-sm font-medium group-hover:text-primary">{tour.title}</div>
                                                <div className="text-xs text-muted-foreground">★ {tour.averageRating.toFixed(1)}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {(business.type === 'hotel' || business.type === 'guesthouse') && (
                            <div className="mt-6">
                                <RelevantAdSlot
                                    placementSlot="hotel_page"
                                    destinationId={business.destinationId || undefined}
                                    title="Nearby places to eat"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
