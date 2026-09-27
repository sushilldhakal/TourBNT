/**
 * Centralized cache invalidation.
 * Use queryKeys and these helpers so invalidation stays in sync with key shape.
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export interface InvalidateDestinationsOptions {
    my?: boolean;
    admin?: boolean;
    changeRequests?: boolean;
    detailId?: string;
    tourTitlesUserId?: string | null;
    pending?: boolean;
    roleBased?: boolean;
    approved?: boolean;
}

export interface InvalidateCategoriesOptions {
    my?: boolean;
    admin?: boolean;
    changeRequests?: boolean;
    detailId?: string;
    pending?: boolean;
    roleBased?: boolean;
    approved?: boolean;
}

/**
 * Hook that returns a cache manager with invalidation helpers.
 * Use in mutation onSuccess to keep cache in sync.
 */
export function useCacheManager() {
    const queryClient = useQueryClient();

    function invalidateDestinations(opts: InvalidateDestinationsOptions = {}) {
        const {
            my = false,
            admin = false,
            changeRequests = false,
            detailId,
            tourTitlesUserId,
            pending = false,
            roleBased = false,
            approved = false,
        } = opts;

        if (my) {
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.myDestinations() });
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.myActive() });
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.myFavorites() });
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.myCreated() });
        }
        if (admin) {
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.adminPending() });
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.adminAll() });
        }
        if (changeRequests) {
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.adminChangeRequests() });
        }
        if (approved) {
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.approved() });
        }
        if (pending) {
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.pending() });
        }
        if (roleBased) {
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.roleBased() });
        }
        if (detailId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.detail(detailId) });
        }
        if (tourTitlesUserId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.destinations.tourTitles(tourTitlesUserId) });
        }
    }

    function invalidateCategories(opts: InvalidateCategoriesOptions = {}) {
        const {
            my = false,
            admin = false,
            changeRequests = false,
            detailId,
            pending = false,
            roleBased = false,
            approved = false,
        } = opts;

        if (my) {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.myCategories() });
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.myActive() });
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.myFavorites() });
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.myCreated() });
        }
        if (admin) {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.adminPending() });
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.adminAll() });
        }
        if (changeRequests) {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.adminChangeRequests() });
        }
        if (approved) {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.approved() });
        }
        if (pending) {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.pending() });
        }
        if (roleBased) {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.roleBased() });
        }
        if (detailId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories.detail(detailId) });
        }
    }

    function invalidateBookings() {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all() });
    }

    function invalidateMedia() {
        queryClient.invalidateQueries({ queryKey: queryKeys.media.all() });
    }

    function invalidateTours(opts?: { detailId?: string }) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tours.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tours.myTours() });
        if (opts?.detailId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.tours.detail(opts.detailId) });
        }
    }

    function invalidatePosts(opts?: { detailId?: string }) {
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all() });
        if (opts?.detailId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(opts.detailId) });
        }
    }

    function invalidateComments(opts?: { postId?: string; commentId?: string; all?: boolean }) {
        if (opts?.postId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(opts.postId) });
        }
        if (opts?.commentId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.comments.replies(opts.commentId) });
        }
        if (opts?.all || (!opts?.postId && !opts?.commentId)) {
            queryClient.invalidateQueries({ queryKey: queryKeys.comments.all() });
        }
    }

    function invalidateUsers(opts?: { detailId?: string }) {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
        if (opts?.detailId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(opts.detailId) });
        }
    }

    function invalidateCurrentUser() {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.currentUser() });
    }

    function invalidateSubscribers() {
        queryClient.invalidateQueries({ queryKey: queryKeys.subscribers.all() });
    }

    function invalidateUserSettings() {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSettings.all() });
    }

    function invalidateFaq(userId?: string | null) {
        if (userId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.faq.list(userId) });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.faq.all() });
    }

    function invalidateFacts(userId?: string | null) {
        if (userId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.facts.list(userId) });
        }
    }

    function invalidatePresets(userId?: string | null) {
        if (userId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.discount(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.pax(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.pricing(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.date(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.content(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.itinerary(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.presets.tourTemplate(userId) });
        }
    }

    return {
        invalidateDestinations,
        invalidateCategories,
        invalidateBookings,
        invalidateMedia,
        invalidateTours,
        invalidatePosts,
        invalidateComments,
        invalidateUsers,
        invalidateCurrentUser,
        invalidateSubscribers,
        invalidateUserSettings,
        invalidateFaq,
        invalidateFacts,
        invalidatePresets,
        queryClient,
    };
}
