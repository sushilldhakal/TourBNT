'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
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
}

export function ItineraryAccordion({ itinerary, outline }: ItineraryAccordionProps) {
    const [activeDay, setActiveDay] = useState<string[]>(['day-0']);

    if (!itinerary || itinerary.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No itinerary information available
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Map embed display */}
            {outline && (
                <div className="mb-4 sm:mb-6" role="region" aria-label="Tour route map">
                    <div
                        className="w-full rounded-lg overflow-hidden border"
                        dangerouslySetInnerHTML={{ __html: outline }}
                    />
                </div>
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

                                            {/* Destination if available */}
                                            {day.destination && (
                                                <div className="text-xs sm:text-sm">
                                                    <span className="font-medium text-muted-foreground">Destination: </span>
                                                    <span className="text-foreground">{day.destination}</span>
                                                </div>
                                            )}

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
