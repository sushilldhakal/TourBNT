/**
 * Company API endpoints
 */

import type { CompanyInfo } from '@/types/company';

// TODO(launch): placeholder contact details — replace the address, phone and social links with the real ones.
export const mockCompanyInfo: CompanyInfo = {
    companyName: "TourBNT",
    description: "Discover the world with TourBNT - your trusted partner for unforgettable travel experiences and adventures around the globe.",
    contactPhone: "+61 0433 926 079",
    contactEmail: "support@TourBNT.com",
    address: "123 Travel Lane, Sydney, NSW 2000, Australia",
    resources: [
        { title: "Travel Guides", link: "/blog" },
        { title: "Tour Packages", link: "/tours" },
        { title: "Destinations", link: "/destinations" },
        { title: "Tour Operators", link: "/agencies" }
    ],
    quickLinks: [
        { title: "About Us", link: "/about" },
        { title: "Help Center", link: "/help" },
        { title: "Contact Us", link: "/contact" },
        { title: "Cancellation & Refund Policy", link: "/refund-policy" }
    ],
    socialMedia: [
        { platform: "Facebook", link: "https://facebook.com/TourBNT", icon: "facebook" },
        { platform: "Twitter", link: "https://twitter.com/TourBNT", icon: "twitter" },
        { platform: "Instagram", link: "https://instagram.com/TourBNT", icon: "instagram" },
        { platform: "LinkedIn", link: "https://linkedin.com/company/TourBNT", icon: "linkedin" }
    ]
};

export const getCompanyInfo = async (): Promise<CompanyInfo> => {
    try {
        // Static for now (no backend endpoint yet); resolve immediately so the footer never waits.
        return mockCompanyInfo;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error fetching company info: ${error.message}`);
        } else {
            throw new Error(`Error fetching company info: ${String(error)}`);
        }
    }
};
