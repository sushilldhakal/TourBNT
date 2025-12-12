/**
 * Tour Utility Functions
 * Migrated from dashboard tour utilities
 */

export function getTourDefaults(data?: Partial<any>): any {
    return {
        title: data?.title || '',
        code: data?.code || '',
        excerpt: data?.excerpt || '',
        description: data?.description || null,
        tourStatus: data?.tourStatus || 'draft',
        coverImage: data?.coverImage || '',
        gallery: data?.gallery || [],
        category: data?.category || [],
        destination: data?.destination || null,
        pricing: {
            price: data?.pricing?.price || 0,
            pricePerPerson: data?.pricing?.pricePerPerson ?? true,
            minSize: data?.pricing?.minSize || 1,
            maxSize: data?.pricing?.maxSize || 10,
            pricingOptionsEnabled: data?.pricing?.pricingOptionsEnabled || false,
            discount: data?.pricing?.discount || {
                discountEnabled: false,
                percentageOrPrice: false,
                discountPercentage: 0,
                discountPrice: 0,
            },
        },
        pricingOptions: data?.pricingOptions || [],
        dates: data?.dates || {
            days: 0,
            nights: 0,
            scheduleType: 'flexible',
            departures: [],
        },
        itinerary: data?.itinerary || { options: [] },
        include: data?.include || null,
        exclude: data?.exclude || null,
        facts: data?.facts || [],
        faqs: data?.faqs || [],
        map: data?.map || '',
        ...data,
    };
}

export function generateTourCode(length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
