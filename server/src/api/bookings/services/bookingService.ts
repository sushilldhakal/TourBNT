import { randomBytes } from 'crypto';
import { db, bookings, tours, users, tourAuthors } from '../../../db';
import { eq, and, or, ilike, gte, lt, inArray, desc, asc, count, sql } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { calculateBookingPricing, type PaymentType } from '../utils/pricingCalculator';
import { ItineraryRequestService, findMatchingFixedDeparture } from '../../tours/services/itineraryRequestService';
import { notifyBookingCreated, notifyBookingConfirmed, notifyBookingCancelled, notifyPaymentReceived } from '../../../services/emailService';
import { checkPromo, redeemPromo, releasePromo } from '../../promo/promoService';
import { earningsForNewBooking } from '../../../services/payouts';

type BookingRow = typeof bookings.$inferSelect;

/** Identifies the caller for an ownership-gated write; admins bypass the tour-ownership check entirely. */
interface Requester {
    id: string;
    isAdmin: boolean;
}

interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

const TOUR_COLUMNS = { id: tours.id, title: tours.title, code: tours.code, coverImage: tours.coverImage, price: tours.price, location: tours.location } as const;
const USER_COLUMNS = { id: users.id, name: users.name, email: users.email, phone: users.phone } as const;

// Letters and digits that can't be confused when read out (no 0/O, 1/I/L).
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * A booking reference people can read out, that can't be guessed: 10 characters from a cryptographic random
 * source (~49 bits), after a date-based part. The reference plus the contact email is how a guest finds a booking.
 */
function generateBookingReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const bytes = randomBytes(10);
    const random = Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
    return `BK-${timestamp}-${random}`;
}

/** Batches tour/user lookups for a set of bookings and merges them in as `tour`/`user`. */
async function attachRelations(rows: BookingRow[], opts: { tour?: boolean; user?: boolean } = { tour: true, user: true }): Promise<any[]> {
    if (rows.length === 0) return [];

    const tourIds = Array.from(new Set(rows.map((b) => b.tourId)));
    const userIds = Array.from(new Set(rows.map((b) => b.userId).filter((id): id is string => !!id)));

    const [tourRows, userRows] = await Promise.all([
        opts.tour !== false && tourIds.length > 0 ? db.select(TOUR_COLUMNS).from(tours).where(inArray(tours.id, tourIds)) : Promise.resolve([]),
        opts.user !== false && userIds.length > 0 ? db.select(USER_COLUMNS).from(users).where(inArray(users.id, userIds)) : Promise.resolve([]),
    ]);

    const tourById = new Map(tourRows.map((t) => [t.id, t]));
    const userById = new Map(userRows.map((u) => [u.id, u]));

    return rows.map((b) => ({
        ...b,
        tour: tourById.get(b.tourId) ?? null,
        user: b.userId ? userById.get(b.userId) ?? null : null,
    }));
}

/**
 * Page of bookings with their tour and user in ONE query (left joins), instead of fetching the page
 * and then a second round trip for the related rows. Same output shape as attachRelations.
 */
async function selectBookingsPage(where: any, orderBy: any, limit: number, offset: number, opts: { user?: boolean } = { user: true }) {
    const rows = await db
        .select({ booking: bookings, tour: TOUR_COLUMNS, user: USER_COLUMNS })
        .from(bookings)
        .leftJoin(tours, eq(bookings.tourId, tours.id))
        .leftJoin(users, eq(bookings.userId, users.id))
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    return rows.map(({ booking, tour, user }) => ({
        ...booking,
        tour: tour && (tour as { id?: string }).id ? tour : null,
        user: opts.user !== false && user && (user as { id?: string }).id ? user : null,
    }));
}

function sortColumn(sortBy?: string) {
    switch (sortBy) {
        case 'departureDate':
            return bookings.departureDate;
        case 'totalAmount':
            return sql`(${bookings.pricing}->>'totalPrice')::numeric`;
        default:
            return bookings.createdAt;
    }
}

export class BookingService {
    /**
     * A seller only has visibility/write access to bookings on tours they
     * author — `authorizeRoles('admin', 'seller')` on the route only checks
     * *that* the caller is a seller, not *which* tour(s) they own, so every
     * booking-mutating/listing path a seller can reach must re-check
     * ownership here before touching another seller's bookings.
     */
    private static async assertTourAccess(tourId: string, requester?: Requester) {
        if (!requester || requester.isAdmin) return;
        const [owned] = await db
            .select({ tourId: tourAuthors.tourId })
            .from(tourAuthors)
            .where(and(eq(tourAuthors.tourId, tourId), eq(tourAuthors.userId, requester.id)))
            .limit(1);
        if (!owned) {
            throw createHttpError(403, 'You do not have access to bookings for this tour');
        }
    }

    private static async getTourForBooking(tourId: string) {
        const [tour] = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
        if (!tour) {
            throw createHttpError(404, 'Tour not found');
        }
        return tour;
    }

    private static async checkAvailabilityForTour(tour: typeof tours.$inferSelect, departureDate: Date): Promise<{ available: boolean; remainingCapacity: number; reason?: 'sold_out' | 'logistics_pending' }> {
        const dayStart = new Date(departureDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(departureDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existingBookings = await db
            .select({ participants: bookings.participants })
            .from(bookings)
            .where(
                and(
                    eq(bookings.tourId, tour.id),
                    gte(bookings.departureDate, dayStart),
                    lt(bookings.departureDate, dayEnd),
                    inArray(bookings.status, ['pending', 'confirmed'])
                )
            );

        const totalBooked = existingBookings.reduce((sum, b) => sum + (b.participants?.adults || 0) + (b.participants?.children || 0), 0);

        const maxCapacity = tour.maxSize || 10;
        const remainingCapacity = maxCapacity - totalBooked;

        if (remainingCapacity <= 0) {
            return { available: false, remainingCapacity: 0, reason: 'sold_out' };
        }

        // A fixed-departure date isn't bookable until every hotel/restaurant/
        // guide/transport provider linked to the itinerary has confirmed
        // capacity for it — a flexible/open date has no such pre-negotiated
        // date, so it's unaffected (logistics gets coordinated reactively per
        // booking; see ItineraryRequestService.generateOrUpdateRequestsForBooking).
        if (findMatchingFixedDeparture(tour, departureDate)) {
            const confirmed = await ItineraryRequestService.isFixedDepartureDateConfirmed(tour.id, departureDate);
            if (!confirmed) {
                return { available: false, remainingCapacity: Math.max(0, remainingCapacity), reason: 'logistics_pending' };
            }
        }

        return {
            available: true,
            remainingCapacity: Math.max(0, remainingCapacity),
        };
    }

    static async checkAvailability(tourId: string, departureDate: Date): Promise<{ available: boolean; remainingCapacity: number; reason?: 'sold_out' | 'logistics_pending' }> {
        const tour = await BookingService.getTourForBooking(tourId);
        return BookingService.checkAvailabilityForTour(tour, departureDate);
    }

    /**
     * The authoritative price of a booking, including a promo code if one was entered. Used both to quote a price
     * to the checkout form and to price the booking itself, so the two can never disagree. Throws a friendly 400
     * if the code can't be used. Does not use the code up (createBooking does that).
     */
    private static async priceBooking(
        tour: typeof tours.$inferSelect,
        participants: { adults: number; children: number; infants: number },
        paymentType: PaymentType,
        pricingOptionId: string | null,
        promoCode?: unknown,
    ): Promise<{ pricing: ReturnType<typeof calculateBookingPricing>; promoId: string | null }> {
        const withoutPromo = calculateBookingPricing(tour, participants, paymentType, pricingOptionId);
        if (!promoCode || !String(promoCode).trim()) return { pricing: withoutPromo, promoId: null };
        const check = await checkPromo({ code: promoCode, tourId: tour.id, subtotal: withoutPromo.totalPrice });
        return {
            pricing: calculateBookingPricing(tour, participants, paymentType, pricingOptionId, { code: check.promo.code, amount: check.amount }),
            promoId: check.promo.id,
        };
    }

    /** Price a booking without creating it (checkout preview). */
    static async quoteBooking(input: { tour: string; participants: { adults?: number; children?: number; infants?: number }; paymentType?: PaymentType; pricingOptionId?: string | null; promoCode?: unknown }) {
        const tour = await BookingService.getTourForBooking(input.tour);
        const participants = { adults: input.participants?.adults || 0, children: input.participants?.children || 0, infants: input.participants?.infants || 0 };
        return (await BookingService.priceBooking(tour, participants, input.paymentType || 'full_payment', input.pricingOptionId ?? null, input.promoCode)).pricing;
    }

    static async createBooking(bookingData: any): Promise<BookingRow> {
        if (!bookingData.tour || !bookingData.departureDate || !bookingData.participants) {
            throw createHttpError(400, 'Tour, departure date, and participants are required');
        }

        const tour = await BookingService.getTourForBooking(bookingData.tour);
        const departureDate = new Date(bookingData.departureDate);
        const participants = {
            adults: bookingData.participants?.adults || 0,
            children: bookingData.participants?.children || 0,
            infants: bookingData.participants?.infants || 0,
        };
        const totalParticipants = participants.adults + participants.children;

        const availability = await BookingService.checkAvailabilityForTour(tour, departureDate);
        if (availability.reason === 'logistics_pending') {
            throw createHttpError(400, 'This departure date is not yet bookable — the hotel/guide/transport/restaurant providers for this itinerary haven\'t all confirmed availability yet.');
        }
        if (!availability.available || availability.remainingCapacity < totalParticipants) {
            throw createHttpError(400, `Insufficient capacity. Only ${availability.remainingCapacity} spots remaining.`);
        }

        // Pricing is always computed server-side from the tour's own stored
        // configuration — a client-submitted price/total is never trusted.
        const paymentType: PaymentType = bookingData.paymentType || 'full_payment';
        const quote = await BookingService.priceBooking(tour, participants, paymentType, bookingData.pricingOptionId ?? null, bookingData.promoCode);
        const pricing = quote.pricing;

        // Use up the promo code now (atomically, so the last redemption can't be taken twice); give it back if the
        // booking can't be saved.
        if (quote.promoId && !(await redeemPromo(quote.promoId))) {
            throw createHttpError(400, 'This promo code has just reached its usage limit.');
        }

        // Who is paid for this booking, and the platform's cut — frozen now (see services/payouts.ts).
        const earnings = await earningsForNewBooking(bookingData.tour, pricing.totalPrice);

        let booking: BookingRow;
        try {
          [booking] = await db
            .insert(bookings)
            .values({
                tourId: bookingData.tour,
                // Snapshotted from the tour we just loaded, never from the
                // client — bookingData.tourTitle/tourCode would let a caller
                // record a booking against tourId X under a different tour's
                // name/code, corrupting vouchers and admin listings.
                tourTitle: tour.title,
                tourCode: tour.code,
                userId: bookingData.user ?? null,
                isGuestBooking: !!bookingData.isGuestBooking,
                guestInfo: bookingData.guestInfo ?? null,
                departureDate,
                participants,
                travelers: bookingData.travelers ?? [],
                pricingOptionId: bookingData.pricingOptionId ?? null,
                pricing,
                paymentType,
                contactName: bookingData.contactName,
                contactEmail: bookingData.contactEmail,
                contactPhone: bookingData.contactPhone,
                specialRequests: bookingData.specialRequests ?? null,
                // Always ours: a client-chosen reference could be guessable or clash with someone else's.
                bookingReference: generateBookingReference(),
                promoCode: pricing.promo?.code ?? null,
                sellerId: earnings.sellerId,
                commissionRate: earnings.commissionRate,
                commissionAmount: earnings.commissionAmount,
                sellerEarning: earnings.sellerEarning,
            })
            .returning();
        } catch (err) {
            if (quote.promoId) await releasePromo({ id: quote.promoId }).catch(() => undefined);
            throw err;
        }

        // Fixed-departure dates already have their partner requests from
        // reconcileFixedDepartureRequests (checked above via
        // isFixedDepartureDateConfirmed); a flexible date has none yet, so
        // this booking is what creates/updates them. Best-effort — a
        // logistics-notification hiccup must never fail the booking itself.
        if (!findMatchingFixedDeparture(tour, departureDate)) {
            try {
                await ItineraryRequestService.generateOrUpdateRequestsForBooking(booking);
            } catch (err) {
                console.error(`Failed to generate itinerary partner requests for booking ${booking.id}:`, err);
            }
        }

        // Confirmation to the traveller and an alert to the seller — after the commit, never blocking it.
        void notifyBookingCreated(booking.id);

        return booking;
    }

    /** Bookings on tours this seller authors — the scope every non-admin read is limited to. */
    private static ownedTourIds(userId: string) {
        return db.select({ tourId: tourAuthors.tourId }).from(tourAuthors).where(eq(tourAuthors.userId, userId));
    }

    static async getAllBookings(
        filters: { status?: string; paymentStatus?: string; tourId?: string; q?: string } = {},
        paginationParams: PaginationParams,
        requester?: Requester
    ) {
        const conditions = [];
        if (requester && !requester.isAdmin) conditions.push(inArray(bookings.tourId, BookingService.ownedTourIds(requester.id)));
        if (filters.status) conditions.push(eq(bookings.status, filters.status as any));
        if (filters.paymentStatus) conditions.push(eq(bookings.paymentStatus, filters.paymentStatus as any));
        if (filters.tourId) conditions.push(eq(bookings.tourId, filters.tourId));
        if (filters.q) {
            const like = `%${filters.q}%`;
            conditions.push(or(ilike(bookings.bookingReference, like), ilike(bookings.contactName, like), ilike(bookings.contactEmail, like), ilike(bookings.tourTitle, like)));
        }
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const { page, limit, sortBy, sortOrder } = paginationParams;
        const orderFn = sortOrder === 'asc' ? asc : desc;

        const [items, [{ value: totalItems }]] = await Promise.all([
            selectBookingsPage(where, orderFn(sortColumn(sortBy) as any), limit, (page - 1) * limit),
            db.select({ value: count() }).from(bookings).where(where),
        ]);

        return {
            items,
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
        };
    }

    static async getBookingById(bookingId: string) {
        const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }
        const [withRelations] = await attachRelations([booking]);
        return withRelations;
    }

    static async getBookingByReference(reference: string) {
        const [booking] = await db.select().from(bookings).where(eq(bookings.bookingReference, reference)).limit(1);
        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }
        const [withRelations] = await attachRelations([booking]);
        return withRelations;
    }

    static async getUserBookings(userId: string, paginationParams: PaginationParams, status?: string) {
        const conditions = [eq(bookings.userId, userId)];
        if (status) conditions.push(eq(bookings.status, status as any));
        const where = and(...conditions);

        const { page, limit } = paginationParams;

        const [items, [{ value: totalItems }]] = await Promise.all([
            selectBookingsPage(where, desc(bookings.createdAt), limit, (page - 1) * limit, { user: false }),
            db.select({ value: count() }).from(bookings).where(where),
        ]);

        return {
            items,
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
        };
    }

    static async getTourBookings(tourId: string, paginationParams: PaginationParams, requester?: Requester) {
        await BookingService.assertTourAccess(tourId, requester);
        const where = eq(bookings.tourId, tourId);
        const { page, limit } = paginationParams;

        const [rows, [{ value: totalItems }]] = await Promise.all([
            db.select().from(bookings).where(where).orderBy(desc(bookings.createdAt)).limit(limit).offset((page - 1) * limit),
            db.select({ value: count() }).from(bookings).where(where),
        ]);

        const items = await attachRelations(rows, { tour: false, user: true });

        return {
            items,
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
        };
    }

    static async updateBookingStatus(bookingId: string, status: string, notes?: string, requester?: Requester) {
        if (requester && !requester.isAdmin) {
            const [existing] = await db.select({ tourId: bookings.tourId }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);
            if (!existing) {
                throw createHttpError(404, 'Booking not found');
            }
            await BookingService.assertTourAccess(existing.tourId, requester);
        }

        const updateData: Partial<BookingRow> = { status: status as any, updatedAt: new Date() };

        if (status === 'confirmed') {
            updateData.confirmedAt = new Date();
        } else if (status === 'cancelled') {
            updateData.cancelledAt = new Date();
            if (notes) {
                updateData.cancellationReason = notes;
            }
        }

        if (notes && status !== 'cancelled') {
            updateData.notes = notes;
        }

        const [before] = await db.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);
        const [booking] = await db.update(bookings).set(updateData).where(eq(bookings.id, bookingId)).returning();
        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        // Tell the traveller about a real change only (not a repeated save of the same status).
        if (before?.status !== status) {
            if (status === 'confirmed') void notifyBookingConfirmed(booking.id);
            if (status === 'cancelled') void notifyBookingCancelled(booking.id);
        }

        if (status === 'cancelled' && before?.status !== 'cancelled' && booking.promoCode) {
            await releasePromo({ code: booking.promoCode }).catch((err) => console.error(`Failed to release promo ${booking.promoCode} for cancelled booking ${booking.id}:`, err));
        }

        if (status === 'cancelled') {
            try {
                await ItineraryRequestService.removeContributionForBooking(booking.id);
            } catch (err) {
                console.error(`Failed to remove itinerary request contribution for cancelled booking ${booking.id}:`, err);
            }
        }

        const [withRelations] = await attachRelations([booking], { tour: true, user: false });
        return withRelations;
    }

    static async updatePaymentStatus(bookingId: string, paymentStatus: string, paidAmount?: number, transactionId?: string, requester?: Requester) {
        if (requester && !requester.isAdmin) {
            const [existing] = await db.select({ tourId: bookings.tourId }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);
            if (!existing) {
                throw createHttpError(404, 'Booking not found');
            }
            await BookingService.assertTourAccess(existing.tourId, requester);
        }

        const [prior] = await db.select({ paymentStatus: bookings.paymentStatus }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);
        const updateData: Partial<BookingRow> = { paymentStatus: paymentStatus as any, updatedAt: new Date() };

        if (paidAmount !== undefined) {
            updateData.paidAmount = paidAmount;
        }

        if (transactionId) {
            updateData.transactionId = transactionId;
        }

        const [booking] = await db.update(bookings).set(updateData).where(eq(bookings.id, bookingId)).returning();
        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        // Receipt when money is actually received (the future payment-gateway webhook goes through here too).
        if (prior?.paymentStatus !== paymentStatus && (paymentStatus === 'paid' || paymentStatus === 'partial')) {
            void notifyPaymentReceived(booking.id);
        }

        return booking;
    }

    static async cancelBooking(bookingId: string, reason?: string) {
        const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        if (booking.status === 'cancelled') {
            throw createHttpError(400, 'Booking is already cancelled');
        }

        const departureDate = new Date(booking.departureDate);
        const now = new Date();
        const hoursUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeparture < 48) {
            throw createHttpError(400, 'Cancellation not allowed within 48 hours of departure');
        }

        return BookingService.updateBookingStatus(bookingId, 'cancelled', reason);
    }

    static async generateVoucher(bookingId: string) {
        const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
        if (!booking) {
            throw createHttpError(404, 'Booking not found');
        }

        const [withRelations] = await attachRelations([booking]);

        return {
            bookingReference: withRelations.bookingReference,
            tour: withRelations.tour,
            customer: withRelations.user || withRelations.guestInfo,
            departureDate: withRelations.departureDate,
            participants: withRelations.participants,
            travelers: withRelations.travelers,
            pricing: withRelations.pricing,
            status: withRelations.status,
            contactInfo: {
                name: withRelations.contactName,
                email: withRelations.contactEmail,
                phone: withRelations.contactPhone,
            },
        };
    }

    static async getBookingStats(requester?: Requester) {
        const scope = requester && !requester.isAdmin ? inArray(bookings.tourId, BookingService.ownedTourIds(requester.id)) : undefined;
        const rows = await db
            .select({
                status: bookings.status,
                count: count(),
                totalRevenue: sql<number>`COALESCE(SUM((${bookings.pricing}->>'totalPrice')::numeric), 0)`,
                paidRevenue: sql<number>`COALESCE(SUM(${bookings.paidAmount}), 0)`,
            })
            .from(bookings)
            .where(scope)
            .groupBy(bookings.status);

        return rows.map((r) => ({
            _id: r.status,
            count: r.count,
            totalRevenue: Number(r.totalRevenue),
            paidRevenue: Number(r.paidRevenue),
        }));
    }
}
