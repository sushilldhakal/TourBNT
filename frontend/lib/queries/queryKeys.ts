/**
 * Centralized query key factory.
 * Single source of truth for all React Query keys.
 * Use these keys in queries and in cacheUtils for invalidation.
 */

export const queryKeys = {
    // Destinations
    destinations: {
        all: () => ['destinations'] as const,
        myDestinations: () => [...queryKeys.destinations.all(), 'my-destinations'] as const,
        myActive: () => [...queryKeys.destinations.all(), 'my-active'] as const,
        myFavorites: () => [...queryKeys.destinations.all(), 'my-favorites'] as const,
        myCreated: () => [...queryKeys.destinations.all(), 'my-created'] as const,
        adminPending: () => [...queryKeys.destinations.all(), 'admin', 'pending'] as const,
        adminAll: () => [...queryKeys.destinations.all(), 'admin', 'all'] as const,
        adminChangeRequests: () => [...queryKeys.destinations.all(), 'admin', 'change-requests'] as const,
        approved: () => [...queryKeys.destinations.all(), 'approved'] as const,
        search: (query: string) => [...queryKeys.destinations.all(), 'search', query] as const,
        /** Role-based list (admin: all, user: my) – same as all() for admin */
        roleBased: () => [...queryKeys.destinations.all()] as const,
        /** Pending list key (admin) */
        pending: () => ['pending-destinations'] as const,
        /** Single destination detail */
        detail: (id: string) => ['destination', id] as const,
        /** Tour titles by user (used by destination forms) */
        tourTitles: (userId: string | undefined) => ['tourTitles', userId] as const,
    },

    // Categories
    categories: {
        all: () => ['categories'] as const,
        myCategories: () => [...queryKeys.categories.all(), 'my-categories'] as const,
        myActive: () => [...queryKeys.categories.all(), 'my-active'] as const,
        myFavorites: () => [...queryKeys.categories.all(), 'my-favorites'] as const,
        myCreated: () => [...queryKeys.categories.all(), 'my-created'] as const,
        adminPending: () => [...queryKeys.categories.all(), 'admin', 'pending'] as const,
        adminAll: () => [...queryKeys.categories.all(), 'admin', 'all'] as const,
        adminChangeRequests: () => [...queryKeys.categories.all(), 'admin', 'change-requests'] as const,
        approved: () => [...queryKeys.categories.all(), 'approved'] as const,
        search: (query: string) => [...queryKeys.categories.all(), 'search', query] as const,
        roleBased: () => [...queryKeys.categories.all()] as const,
        pending: () => ['pending-categories'] as const,
        detail: (id: string) => ['category', id] as const,
    },

    // Bookings
    bookings: {
        all: () => ['userBookings'] as const,
        detail: (reference: string) => ['booking', reference] as const,
    },

    // Media
    media: {
        all: () => ['media'] as const,
        list: (mediaType: string) => ['media', mediaType] as const,
    },

    // Tours
    tours: {
        all: () => ['tours'] as const,
        detail: (tourId: string | undefined) => ['tour', tourId] as const,
        myTours: () => ['my-tours'] as const,
        titlesByIds: (ids: string[]) => ['tourTitlesByIds', ids] as const,
    },

    // Posts
    posts: {
        all: () => ['posts'] as const,
        detail: (id: string) => ['post', id] as const,
    },

    // Comments
    comments: {
        all: () => ['comments'] as const,
        list: (postId: string) => ['comments', postId] as const,
        replies: (commentId: string) => ['comment-replies', commentId] as const,
    },

    // Users
    users: {
        all: () => ['users'] as const,
        detail: (userId: string) => ['user', userId] as const,
        currentUser: () => ['currentUser'] as const,
    },

    // Subscribers
    subscribers: {
        all: () => ['subscribers'] as const,
    },

    // User settings
    userSettings: {
        all: () => ['userSettings'] as const,
    },

    // FAQ (dashboard)
    faq: {
        list: (userId: string | null) => ['Faq', userId] as const,
        all: () => ['Faq'] as const,
        detail: (faqId: string) => ['singleFaq', faqId] as const,
    },

    // Facts (dashboard)
    facts: {
        list: (userId: string | null) => ['Facts', userId] as const,
        detail: (factId: string) => ['singleFact', factId] as const,
    },

    // Tour settings presets
    presets: {
        discount: (userId: string | undefined) => ['discount-presets', userId] as const,
        pax: (userId: string | undefined) => ['pax-presets', userId] as const,
        pricing: (userId: string | undefined) => ['pricing-presets', userId] as const,
        date: (userId: string | undefined) => ['date-presets', userId] as const,
        content: (userId: string | undefined) => ['content-presets', userId] as const,
        itinerary: (userId: string | undefined) => ['itinerary-presets', userId] as const,
        tourTemplate: (userId: string | undefined) => ['tour-template-presets', userId] as const,
    },

    // Company (footer, public)
    company: {
        info: () => ['companyInfo'] as const,
    },

    // Reviews
    reviews: {
        tour: (tourId: string) => ['reviews', 'tour', tourId] as const,
        approved: (limit?: number) => ['reviews', 'approved', limit] as const,
    },

    // Featured tour titles (categories/destinations grids)
    featuredTourTitles: (userId: string | undefined) => ['tourTitles', userId] as const,

    // Business partners (hotels/restaurants/guides/logistics/advertisers)
    businessPartners: {
        mine: () => ['business-partners', 'mine'] as const,
        capacity: (businessPartnerId: string) => ['business-partners', businessPartnerId, 'capacity'] as const,
        capacityOverrides: (businessPartnerId: string) => ['business-partners', businessPartnerId, 'capacity-overrides'] as const,
        requests: (businessPartnerId: string, status?: string) => ['business-partners', businessPartnerId, 'requests', status] as const,
        tourLogisticsStatus: (tourId: string) => ['tours', tourId, 'logistics-status'] as const,
    },
};

/** Backward-compat: destinations key set (same shape as before) */
export const destinationKeys = queryKeys.destinations;

/** Backward-compat: categories key set */
export const categoryKeys = queryKeys.categories;
