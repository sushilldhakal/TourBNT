import { db, bookings, tours, users, tourAuthors } from '@tourbnt/db';
import { eq, and, gte, lt, inArray, desc, asc, count, sql } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { calculateBookingPricing, type PaymentType } from '../utils/pricingCalculator';

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

function generateBookingReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
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

    private static async checkAvailabilityForTour(tour: typeof tours.$inferSelect, departureDate: Date): Promise<{ available: boolean; remainingCapacity: number }> {
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

        return {
            available: remainingCapacity > 0,
            remainingCapacity: Math.max(0, remainingCapacity),
        };
    }

    static async checkAvailability(tourId: string, departureDate: Date): Promise<{ available: boolean; remainingCapacity: number }> {
        const tour = await BookingService.getTourForBooking(tourId);
        return BookingService.checkAvailabilityForTour(tour, departureDate);
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
        if (!availability.available || availability.remainingCapacity < totalParticipants) {
            throw createHttpError(400, `Insufficient capacity. Only ${availability.remainingCapacity} spots remaining.`);
        }

        // Pricing is always computed server-side from the tour's own stored
        // configuration — a client-submitted price/total is never trusted.
        const paymentType: PaymentType = bookingData.paymentType || 'full_payment';
        const pricing = calculateBookingPricing(tour, participants, paymentType, bookingData.pricingOptionId ?? null);

        const [booking] = await db
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
                bookingReference: bookingData.bookingReference || generateBookingReference(),
            })
            .returning();

        return booking;
    }

    static async getAllBookings(filters: { status?: string; paymentStatus?: string; tourId?: string } = {}, paginationParams: PaginationParams) {
        const conditions = [];
        if (filters.status) conditions.push(eq(bookings.status, filters.status as any));
        if (filters.paymentStatus) conditions.push(eq(bookings.paymentStatus, filters.paymentStatus as any));
        if (filters.tourId) conditions.push(eq(bookings.tourId, filters.tourId));
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const { page, limit, sortBy, sortOrder } = paginationParams;
        const orderFn = sortOrder === 'asc' ? asc : desc;

        const [rows, [{ value: totalItems }]] = await Promise.all([
            db.select().from(bookings).where(where).orderBy(orderFn(sortColumn(sortBy) as any)).limit(limit).offset((page - 1) * limit),
            db.select({ value: count() }).from(bookings).where(where),
        ]);

        const items = await attachRelations(rows, { tour: true, user: true });

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

        const [rows, [{ value: totalItems }]] = await Promise.all([
            db.select().from(bookings).where(where).orderBy(desc(bookings.createdAt)).limit(limit).offset((page - 1) * limit),
            db.select({ value: count() }).from(bookings).where(where),
        ]);

        const items = await attachRelations(rows, { tour: true, user: false });

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

        const [booking] = await db.update(bookings).set(updateData).where(eq(bookings.id, bookingId)).returning();
        if (!booking) {
            throw createHttpError(404, 'Booking not found');
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

    static async getBookingStats() {
        const rows = await db
            .select({
                status: bookings.status,
                count: count(),
                totalRevenue: sql<number>`COALESCE(SUM((${bookings.pricing}->>'totalPrice')::numeric), 0)`,
                paidRevenue: sql<number>`COALESCE(SUM(${bookings.paidAmount}), 0)`,
            })
            .from(bookings)
            .groupBy(bookings.status);

        return rows.map((r) => ({
            _id: r.status,
            count: r.count,
            totalRevenue: Number(r.totalRevenue),
            paidRevenue: Number(r.paidRevenue),
        }));
    }
}
