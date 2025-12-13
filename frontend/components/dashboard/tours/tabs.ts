import {
    FileText,
    CreditCard,
    MapPin,
    ClipboardCheck,
    Package,
    Image,
    HelpCircle,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

/**
 * Tour Editor Tab Configuration
 * Defines all tab sections for the tour editor with icons and labels
 */

export interface TourTab {
    id: string;
    title: string;
    icon: LucideIcon;
    description?: string;
}

export const tourEditorTabs: TourTab[] = [
    {
        id: 'overview',
        title: 'Overview',
        icon: FileText,
        description: 'Basic tour information, title, description, and media',
    },
    {
        id: 'pricing',
        title: 'Price & Dates',
        icon: CreditCard,
        description: 'Pricing configuration and tour dates',
    },
    {
        id: 'itinerary',
        title: 'Itinerary and Destination',
        icon: MapPin,
        description: 'Day-by-day itinerary and location details',
    },
    {
        id: 'inc-exc',
        title: 'Inc+/Exc-',
        icon: ClipboardCheck,
        description: 'What\'s included and excluded in the tour',
    },
    {
        id: 'facts',
        title: 'Facts',
        icon: Package,
        description: 'Tour facts and key information',
    },
    {
        id: 'gallery',
        title: 'Gallery',
        icon: Image,
        description: 'Tour images and media gallery',
    },
    {
        id: 'faqs',
        title: 'FAQs',
        icon: HelpCircle,
        description: 'Frequently asked questions',
    },
];

/**
 * Get tab by ID
 */
export const getTabById = (id: string): TourTab | undefined => {
    return tourEditorTabs.find(tab => tab.id === id);
};

/**
 * Get tab index by ID
 */
export const getTabIndex = (id: string): number => {
    return tourEditorTabs.findIndex(tab => tab.id === id);
};

/**
 * Get next tab
 */
export const getNextTab = (currentId: string): TourTab | undefined => {
    const currentIndex = getTabIndex(currentId);
    if (currentIndex === -1 || currentIndex === tourEditorTabs.length - 1) {
        return undefined;
    }
    return tourEditorTabs[currentIndex + 1];
};

/**
 * Get previous tab
 */
export const getPreviousTab = (currentId: string): TourTab | undefined => {
    const currentIndex = getTabIndex(currentId);
    if (currentIndex <= 0) {
        return undefined;
    }
    return tourEditorTabs[currentIndex - 1];
};
