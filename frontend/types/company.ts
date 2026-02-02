/**
 * Company / footer types.
 */

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
