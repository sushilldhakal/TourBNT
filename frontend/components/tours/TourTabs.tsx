'use client';

import { Tour } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RichTextRenderer from '@/components/RichTextRenderer';
import { ItineraryAccordion } from './ItineraryAccordion';
import { BasePricing } from './BasePricing';
import { PricingOptions } from './PricingOptions';
import { DepartureManager } from './DepartureManager';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckCircle2, XCircle } from 'lucide-react';

interface TourTabsProps {
    tour: Tour;
    onBookNow?: (departure: any) => void;
}

export function TourTabs({ tour, onBookNow }: TourTabsProps) {
    return (
        <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto gap-1 p-1" role="tablist" aria-label="Tour information tabs">
                <TabsTrigger
                    value="description"
                    className="text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5 min-h-[44px] data-[state=active]:bg-background"
                    role="tab"
                >
                    <span className="hidden sm:inline">Description</span>
                    <span className="sm:hidden">Info</span>
                </TabsTrigger>
                <TabsTrigger
                    value="itinerary"
                    className="text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5 min-h-[44px] data-[state=active]:bg-background"
                    role="tab"
                >
                    <span className="hidden sm:inline">Itinerary & Direction</span>
                    <span className="sm:hidden">Itinerary</span>
                </TabsTrigger>
                <TabsTrigger
                    value="pricing"
                    className="text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5 min-h-[44px] data-[state=active]:bg-background"
                    role="tab"
                >
                    <span className="hidden sm:inline">Price & Dates</span>
                    <span className="sm:hidden">Pricing</span>
                </TabsTrigger>
                <TabsTrigger
                    value="faqs"
                    className="text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5 min-h-[44px] data-[state=active]:bg-background"
                    role="tab"
                >
                    FAQs
                </TabsTrigger>
            </TabsList>

            {/* Description Tab */}
            <TabsContent value="description" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6" role="tabpanel">
                {/* Tour Description */}
                {tour.description && (
                    <section className="bg-card border rounded-lg p-4 sm:p-6" aria-labelledby="about-heading">
                        <h3 id="about-heading" className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">About This Tour</h3>
                        <RichTextRenderer content={tour.description} />
                    </section>
                )}

                {/* Inclusions and Exclusions */}
                <InclusionsExclusions
                    inclusions={tour.include}
                    exclusions={tour.exclude}
                />
            </TabsContent>

            {/* Itinerary Tab */}
            <TabsContent value="itinerary" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6" role="tabpanel">
                <section className="bg-card border rounded-lg p-4 sm:p-6" aria-labelledby="itinerary-heading">
                    <h3 id="itinerary-heading" className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Tour Itinerary</h3>

                    {tour.itinerary && tour.itinerary.length > 0 ? (
                        <ItineraryAccordion
                            itinerary={tour.itinerary}
                            outline={tour.outline}
                        />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm sm:text-base" role="status">
                            No itinerary information available
                        </div>
                    )}
                </section>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6" role="tabpanel">
                {/* Base Pricing */}
                <BasePricing
                    basePrice={tour.price}
                    saleEnabled={tour.saleEnabled}
                    salePrice={tour.salePrice}
                    pricePerPerson={tour.pricePerPerson}
                    priceLockDate={tour.priceLockDate}
                />

                {/* Advanced Pricing Options */}
                {tour.pricingOptionsEnabled && tour.pricingGroups && (
                    <PricingOptions pricingGroups={tour.pricingGroups} />
                )}

                {/* Departure Dates */}
                {tour.tourDates && (
                    <section className="bg-card border rounded-lg p-4 sm:p-6" aria-labelledby="departures-heading">
                        <h3 id="departures-heading" className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Available Departure Dates</h3>
                        <DepartureManager
                            tourDates={tour.tourDates}
                            basePrice={tour.price}
                            salePrice={tour.salePrice}
                            saleEnabled={tour.saleEnabled}
                            pricingOptions={tour.pricingOptions}
                            pricingGroups={tour.pricingGroups}
                            pricePerPerson={tour.pricePerPerson}
                            onBookNow={onBookNow}
                        />
                    </section>
                )}
            </TabsContent>

            {/* FAQs Tab */}
            <TabsContent value="faqs" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6" role="tabpanel">
                <section className="bg-card border rounded-lg p-4 sm:p-6" aria-labelledby="faqs-heading">
                    <h3 id="faqs-heading" className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Frequently Asked Questions</h3>

                    {tour.faqs && tour.faqs.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {tour.faqs.map((faq, index) => (
                                <AccordionItem key={faq._id || faq.id || index} value={`faq-${index}`}>
                                    <AccordionTrigger
                                        className="text-left text-sm sm:text-base"
                                        aria-label={`Question: ${faq.question}`}
                                    >
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-sm sm:text-base">
                                        <RichTextRenderer content={faq.answer} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm sm:text-base" role="status">
                            No FAQs available for this tour
                        </div>
                    )}
                </section>
            </TabsContent>
        </Tabs>
    );
}

interface InclusionsExclusionsProps {
    inclusions?: string;
    exclusions?: string;
}

function InclusionsExclusions({ inclusions, exclusions }: InclusionsExclusionsProps) {
    if (!inclusions && !exclusions) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Inclusions */}
            {inclusions && (
                <section className="bg-card border rounded-lg p-4 sm:p-6" aria-labelledby="inclusions-heading">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 shrink-0" aria-hidden="true" />
                        <h3 id="inclusions-heading" className="text-base sm:text-lg font-semibold">What's Included</h3>
                    </div>
                    <div className="text-sm">
                        <RichTextRenderer content={inclusions} />
                    </div>
                </section>
            )}

            {/* Exclusions */}
            {exclusions && (
                <section className="bg-card border rounded-lg p-4 sm:p-6" aria-labelledby="exclusions-heading">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
                        <h3 id="exclusions-heading" className="text-base sm:text-lg font-semibold">What's Not Included</h3>
                    </div>
                    <div className="text-sm">
                        <RichTextRenderer content={exclusions} />
                    </div>
                </section>
            )}
        </div>
    );
}
