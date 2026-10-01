'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';
import { useApprovedDestinations } from '@/lib/queries';
import { Itinerary } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/tourUtils';
import { cn } from '@/lib/utils';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import RichTextRenderer from '@/components/RichTextRenderer';
import dynamic from 'next/dynamic';
import type { ItineraryMapPoint } from '@/components/tours/ItineraryMap';

// Leaflet touches `window`, so it only loads in the browser.
const ItineraryMap = dynamic(() => import('@/components/tours/ItineraryMap'), {
    ssr: false,
    loading: () => <div className="h-56 w-full animate-pulse rounded-2xl bg-muted sm:h-72" />,
});

const PARTNER_ROLE_LABEL: Record<string, string> = {
    transport: 'Transport',
    accommodation: 'Stay',
    guide: 'Guide',
    meals: 'Meals',
    other: 'Also involved',
};

interface ItineraryAccordionProps {
    itinerary: Itinerary[];
    outline?: string;
    /** Resolve itinerary destination ID to name (from relatedData.destinations) */
    destinations?: { id: string; name: string }[];
}

export function ItineraryAccordion({ itinerary, outline, destinations }: ItineraryAccordionProps) {
    const [activeDay, setActiveDay] = useState<string[]>(['day-0']);

    // Destination links: a day's destination is either an id or free text ("Bahundanda").
    // If it matches a TourBNT destination (by id or name) it links to that destination's page;
    // otherwise it falls back to a map search so it is still a useful link.
    const { data: approvedData } = useApprovedDestinations();
    const destinationIndex = useMemo(() => {
        const approved = ((approvedData as { data?: Array<{ id?: string; _id?: string; name?: string }> } | undefined)?.data ?? []).map((d) => ({ id: String(d.id ?? d._id ?? ''), name: d.name ?? '' }));
        const all = [...(destinations ?? []), ...approved].filter((d) => d.id);
        const byId = new Map(all.map((d) => [d.id, d]));
        const byName = new Map(all.filter((d) => d.name).map((d) => [d.name.trim().toLowerCase(), d]));
        return { byId, byName };
    }, [approvedData, destinations]);
    // One map pin per consecutive stop: days that share a destination collapse into a single pin.
    const mapPoints = useMemo<ItineraryMapPoint[]>(() => {
        const approved = ((approvedData as { data?: Array<{ id?: string; _id?: string; name?: string; latitude?: number | null; longitude?: number | null }> } | undefined)?.data ?? []);
        const coordsById = new Map<string, { lat: number; lng: number; name: string }>();
        const coordsByName = new Map<string, { lat: number; lng: number; name: string }>();
        for (const d of approved) {
            if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number') continue;
            const c = { lat: d.latitude, lng: d.longitude, name: d.name ?? '' };
            coordsById.set(String(d.id ?? d._id ?? ''), c);
            if (d.name) coordsByName.set(d.name.trim().toLowerCase(), c);
        }
        const out: ItineraryMapPoint[] = [];
        (itinerary ?? []).forEach((day, i) => {
            const raw = day.destination != null ? String(day.destination).trim() : '';
            const c = raw ? coordsById.get(raw) ?? coordsByName.get(raw.toLowerCase()) : undefined;
            if (!c) return;
            const last = out[out.length - 1];
            if (last && last.lat === c.lat && last.lng === c.lng) last.days.push(i + 1);
            else out.push({ name: c.name, lat: c.lat, lng: c.lng, days: [i + 1] });
        });
        return out;
    }, [approvedData, itinerary]);

    const resolveDestinationLink = (value: string | undefined): { name: string; href: string; external: boolean } | null => {
        const raw = value != null ? String(value).trim() : '';
        if (!raw) return null;
        const match = destinationIndex.byId.get(raw) ?? destinationIndex.byName.get(raw.toLowerCase());
        if (match) return { name: match.name || raw, href: `/destinations/${match.id}`, external: false };
        return { name: raw, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${raw}, Nepal`)}`, external: true };
    };

    if (!itinerary || itinerary.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No itinerary information available
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Outline: the editor saves a rich-text document (JSON); older tours stored a map embed (HTML). */}
            {outline && (
                outline.trim().startsWith('{') ? (
                    <div className="mb-4 sm:mb-6 text-sm sm:text-base text-muted-foreground" role="region" aria-label="Itinerary overview">
                        <RichTextRenderer content={outline} />
                    </div>
                ) : (
                    <div className="mb-4 sm:mb-6" role="region" aria-label="Tour route map">
                        <div
                            className="w-full rounded-lg overflow-hidden border"
                            dangerouslySetInnerHTML={{ __html: outline }}
                        />
                    </div>
                )
            )}

            {mapPoints.length > 0 && (
                <ItineraryMap points={mapPoints} onActiveDay={(day) => setActiveDay((prev) => (prev.includes(`day-${day - 1}`) ? prev : [...prev, `day-${day - 1}`]))} />
            )}

            {/* Itinerary accordion with timeline */}
            <div className="space-y-2 relative" role="region" aria-label="Day-by-day itinerary">
                {/* Vertical timeline line - adjusted for mobile */}
                <div className="absolute left-[18px] sm:left-[22px] top-0 bottom-0 w-[2px] bg-primary/30 z-0" aria-hidden="true" />

                <Accordion type="multiple" value={activeDay} onValueChange={setActiveDay}>
                    {itinerary.map((day, index) => (
                        <AccordionItem
                            key={index}
                            value={`day-${index}`}
                            className="border-none"
                        >
                            <div className="flex items-start gap-3 sm:gap-4 relative">
                                {/* Numbered circle indicator - smaller on mobile */}
                                <div
                                    className={cn(
                                        'shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center z-10 transition-all duration-200',
                                        activeDay.includes(`day-${index}`)
                                            ? 'bg-primary text-primary-foreground shadow-md'
                                            : 'bg-background border-2 border-gray-300 dark:border-gray-600 text-foreground'
                                    )}
                                    aria-hidden="true"
                                >
                                    <span className="font-bold text-xs sm:text-sm">{index + 1}</span>
                                </div>

                                {/* Accordion content */}
                                <div className="flex-1 min-w-0">
                                    <AccordionTrigger
                                        className="hover:no-underline py-2 sm:py-3"
                                        aria-label={`Day ${index + 1}: ${day.title}`}
                                    >
                                        <div className="text-left">
                                            <h3 className="font-semibold text-sm sm:text-base">{day.title}</h3>
                                            {day.date && (
                                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                                    {formatDate(day.date)}
                                                    {day.time && ` • ${formatTime(day.time)}`}
                                                </p>
                                            )}
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent>
                                        <div className="space-y-3 sm:space-y-4 pl-4 sm:pl-6 border-l-2 border-dashed border-gray-200 dark:border-gray-700 ml-[-1px]">
                                            {/* Date and time display */}
                                            {(day.date || day.time) && (
                                                <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
                                                    {day.date && (
                                                        <div>
                                                            <span className="font-medium text-muted-foreground">Date: </span>
                                                            <span className="text-foreground">{formatDate(day.date)}</span>
                                                        </div>
                                                    )}
                                                    {day.time && (
                                                        <div>
                                                            <span className="font-medium text-muted-foreground">Time: </span>
                                                            <span className="text-foreground">{formatTime(day.time)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Rich text description */}
                                            {day.description && (
                                                <div className="text-xs sm:text-sm">
                                                    <RichTextRenderer content={day.description} />
                                                </div>
                                            )}

                                            {/* Destination if available (show name from relatedData.destinations when ID) */}
                                            {(() => {
                                                const link = resolveDestinationLink(day.destination);
                                                if (!link) return null;
                                                const className = 'inline-flex items-center gap-1 text-primary hover:underline underline-offset-2';
                                                return (
                                                    <div className="text-xs sm:text-sm">
                                                        <span className="font-medium text-muted-foreground">Destination: </span>
                                                        {link.external ? (
                                                            <a href={link.href} target="_blank" rel="noopener noreferrer" className={className} title="View on map">
                                                                <MapPin className="h-3 w-3" />{link.name}
                                                            </a>
                                                        ) : (
                                                            <Link href={link.href} className={className}>
                                                                <MapPin className="h-3 w-3" />{link.name}
                                                            </Link>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Logistics: transport/accommodation/guide/meals — linked to the
                                                provider's TourBNT profile when registered, plain text otherwise */}
                                            {day.partners && day.partners.length > 0 && (
                                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm">
                                                    {day.partners.map((p, pIndex) => (
                                                        <div key={pIndex}>
                                                            <span className="font-medium text-muted-foreground">{PARTNER_ROLE_LABEL[p.role] || p.role}: </span>
                                                            {p.businessPartnerId && p.businessPartnerSlug ? (
                                                                <Link
                                                                    href={`/partners/${p.businessPartnerType || 'guide'}/${p.businessPartnerSlug}`}
                                                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                                                >
                                                                    {p.name}
                                                                    {typeof p.businessPartnerRating === 'number' && (
                                                                        <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                                                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                                            {p.businessPartnerRating.toFixed(1)}
                                                                        </span>
                                                                    )}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-foreground">{p.name}</span>
                                                            )}
                                                            {p.notes && <span className="text-muted-foreground"> ({p.notes})</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </div>
                            </div>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </div>
    );
}
