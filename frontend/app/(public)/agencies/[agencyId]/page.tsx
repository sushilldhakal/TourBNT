import Link from 'next/link';
import { Building2, Globe, Mail, MapPin, Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TourCard from '@/components/tours/TourCard';
import { getAgencyById } from '@/lib/api/tours';

// Serve cached HTML and refresh it in the background at most once a minute (ISR).
export const revalidate = 60;
// No pages are built ahead of time; each one is rendered on its first visit and then cached.
export async function generateStaticParams() {
    return [];
}

// Server component: the HTML arrives with the agency and its tours in it.
export default async function SingleAgencyPage({ params }: { params: Promise<{ agencyId: string }> }) {
    const { agencyId } = await params;
    let data: Awaited<ReturnType<typeof getAgencyById>> | null = null;
    try {
        data = await getAgencyById(agencyId);
    } catch {
        data = null;
    }

    if (!data) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-muted-foreground mb-4">Agency not found</p>
                    <Link href="/agencies" className="text-primary hover:text-primary/80">← Back to Agencies</Link>
                </div>
            </div>
        );
    }

    const { agency, tours } = data;

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <Link href="/agencies" className="text-primary hover:text-primary/80 mb-6 inline-block">← Back to Agencies</Link>

            <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Building2 className="h-8 w-8" aria-hidden="true" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold mb-2">{agency.name}</h1>
                            {agency.location && <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{agency.location}</p>}
                            <p className="mt-2 flex items-center gap-2 text-sm">
                                {agency.rating != null ? (
                                    <><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><span className="font-semibold">{agency.rating.toFixed(1)}</span>
                                        <span className="text-muted-foreground">from {agency.reviewCount} review{agency.reviewCount === 1 ? '' : 's'} across {agency.tourCount} tour{agency.tourCount === 1 ? '' : 's'}</span></>
                                ) : <span className="text-muted-foreground">No reviews yet · {agency.tourCount} tour{agency.tourCount === 1 ? '' : 's'}</span>}
                            </p>
                        </div>
                    </div>
                    {agency.description && (
                        <div className="mt-8">
                            <h2 className="text-2xl font-semibold mb-3">About {agency.name}</h2>
                            <p className="text-muted-foreground">{agency.description}</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="font-semibold mb-4">Contact</h3>
                        <div className="flex flex-col gap-2">
                            {agency.phone && <Button asChild variant="outline" size="sm" className="justify-start"><a href={`tel:${agency.phone.replace(/\s+/g, '')}`}><Phone className="mr-2 h-4 w-4" />{agency.phone}</a></Button>}
                            <Button asChild variant="outline" size="sm" className="justify-start"><a href={`mailto:${agency.email}`}><Mail className="mr-2 h-4 w-4" /><span className="truncate">{agency.email}</span></a></Button>
                            {agency.website && <Button asChild variant="outline" size="sm" className="justify-start"><a href={agency.website} target="_blank" rel="noopener noreferrer"><Globe className="mr-2 h-4 w-4" />Website</a></Button>}
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-semibold mb-6">Active tours ({tours.length})</h2>
                {tours.length === 0 ? (
                    <div className="text-center py-16 bg-card border border-border rounded-lg">
                        <p className="text-muted-foreground">This agency has no active tours right now</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tours.map((tour) => <TourCard key={tour.id} tour={tour} viewMode="grid" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
