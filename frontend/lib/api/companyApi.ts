/**
 * Company API endpoints
 */

// Define the CompanyInfo interface
export interface CompanyInfo {
    companyName: string;
    description: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    resources: {
        title: string;
        link: string;
    }[];
    quickLinks: {
        title: string;
        link: string;
    }[];
    socialMedia: {
        platform: string;
        link: string;
        icon: string;
    }[];
}

// For demo purposes - this will be replaced with an actual API call once backend is ready
const mockCompanyInfo: CompanyInfo = {
    companyName: "TourBNT",
    description: "Discover the world with TourBNT - your trusted partner for unforgettable travel experiences and adventures around the globe.",
    contactPhone: "+61 0433 926 079",
    contactEmail: "support@TourBNT.com",
    address: "123 Travel Lane, Sydney, NSW 2000, Australia",
    resources: [
        { title: "Travel Guides", link: "/guides" },
        { title: "Tour Packages", link: "/packages" },
        { title: "Destination Tips", link: "/tips" },
        { title: "Travel Insurance", link: "/insurance" }
    ],
    quickLinks: [
        { title: "About Us", link: "/about" },
        { title: "Our Services", link: "/services" },
        { title: "Meet Our Team", link: "/team" },
        { title: "Download App", link: "/app" }
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
        // In a real implementation, this would be an API call:
        // const response = await api.get('/company-info');
        // return response.data;

        // For now, return the mock data with a simulated delay
        return new Promise((resolve) => {
            setTimeout(() => resolve(mockCompanyInfo), 300);
        });
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error fetching company info: ${error.message}`);
        } else {
            throw new Error(`Error fetching company info: ${String(error)}`);
        }
    }
};
