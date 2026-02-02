/**
 * Tour editor and display types.
 */

import type { LucideIcon } from 'lucide-react';

export interface TourTab {
    id: string;
    title: string;
    icon: LucideIcon;
    description?: string;
}
