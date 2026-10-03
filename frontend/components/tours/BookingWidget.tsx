'use client';

import React from 'react';
import { Phone } from 'lucide-react';
import { Tour } from '@/types/types';
import { FrontBooking } from './FrontBooking';
import { cn } from '@/lib/utils';

interface BookingWidgetProps {
    tour: Tour;
    prefilledDate?: Date;
    className?: string;
}

/**
 * BookingWidget Component
 * 
 * A sidebar widget that displays booking information and form.
 * Features:
 * - Flows with the page (relative, not sticky)
 * - Call center header with phone number
 * - Integrated FrontBooking component
 * - Accepts pre-filled departure date from departure selection
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.3
 */
export function BookingWidget({ tour, prefilledDate, className }: BookingWidgetProps) {
    return (
        <aside
            id="booking-widget"
            className={cn(
                // The negative top margin pulls the widget up beside the tour header on wide layouts only;
                // on narrower screens the widget stacks below the content and must not overlap it.
                "relative lg:mt-[-90px]",
                className
            )}
            aria-label="Tour booking"
        >
            <div className="bg-card border rounded-lg overflow-hidden shadow-lg">
                {/* Call center header with primary background */}
                <div className="bg-primary text-primary-foreground p-3 sm:p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                        <span className="font-bold text-sm sm:text-base">
                            Call Center: <a href="tel:+18882226446" className="hover:underline">+1-888-22-6446</a>
                        </span>
                    </div>
                </div>

                {/* Booking form */}
                <div className="p-4 sm:p-6">
                    <FrontBooking tourData={tour} prefilledDate={prefilledDate} />
                </div>
            </div>
        </aside>
    );
}
