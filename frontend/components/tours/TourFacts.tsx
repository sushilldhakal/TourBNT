'use client';

import { Info } from 'lucide-react';
import { FactData } from '@/lib/types';
import { renderFactValue } from '@/lib/tourUtils';
import Icon from '@/components/Icon';

interface TourFactsProps {
    facts?: FactData[];
}

export function TourFacts({ facts }: TourFactsProps) {
    if (!facts || facts.length === 0) {
        return null;
    }

    return (
        <section className="bg-card border rounded-lg p-4 sm:p-6" aria-labelledby="tour-facts-heading">
            <h2 id="tour-facts-heading" className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Tour Facts</h2>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {facts.map((fact, index) => {
                    const factValue = renderFactValue(fact);

                    // Skip facts with no value
                    if (!factValue) return null;

                    return (
                        <div
                            key={fact.id || fact.name || index}
                            className="flex items-center gap-2"
                        >
                            {/* Dynamic Icon - supports multiple icon libraries */}
                            {fact.icon ? (
                                <Icon
                                    name={fact.icon}
                                    size={20}
                                    className="text-primary shrink-0"
                                />
                            ) : (
                                <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                            )}

                            {/* Title + Value in one line */}
                            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                                    {fact.title || fact.name}:
                                </span>

                                <span className="text-sm sm:text-base font-semibold text-foreground truncate">
                                    {factValue}
                                </span>
                            </div>
                        </div>

                    );
                })}
            </dl>
        </section>
    );
}
