import {
  db,
  tours,
  tourItineraryPartners,
  itineraryPartnerRequests,
  itineraryRequestBookingContributions,
  businessPartnerCapacity,
  businessPartnerCapacityOverrides,
  businessPartners,
  tourAuthors,
  bookings,
} from '@tourbnt/db';
import { eq, and, inArray, sql, ne } from 'drizzle-orm';
import createHttpError from 'http-errors';
import * as notifications from '../../notifications/notificationController';

type TourRow = typeof tours.$inferSelect;
type BookingRow = typeof bookings.$inferSelect;
type ItineraryPartnerRow = typeof tourItineraryPartners.$inferSelect;

interface FixedDeparture {
  _id?: string;
  startDate: string | Date;
  endDate?: string | Date;
  maxPax?: number;
}

const toDateString = (d: Date): string => d.toISOString().slice(0, 10);

const addDays = (d: Date, days: number): Date => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const sameCalendarDay = (a: Date, b: Date): boolean => toDateString(a) === toDateString(b);

/** Finds the array index of the itinerary day whose `id` matches `dayId`, or -1 if the day was removed/reordered away. */
function getItineraryDayIndex(tour: Pick<TourRow, 'itinerary'>, dayId: string): number {
  const itinerary = Array.isArray(tour.itinerary) ? (tour.itinerary as Array<{ id?: string }>) : [];
  return itinerary.findIndex((day) => day?.id === dayId);
}

/** Optional "HH:mm" the seller set on this day's partner entry for this role (meals sittings). */
function getItineraryPartnerServiceTime(tour: Pick<TourRow, 'itinerary'>, dayId: string, role: string): string | undefined {
  const itinerary = Array.isArray(tour.itinerary) ? (tour.itinerary as Array<{ id?: string; partners?: Array<{ role?: string; time?: string }> }>) : [];
  const day = itinerary.find((d) => d?.id === dayId);
  const partner = day?.partners?.find((p) => p?.role === role);
  return partner?.time || undefined;
}

/** The fixed departure (if any) whose startDate falls on the same calendar day as `departureDate`. */
export function findMatchingFixedDeparture(tour: Pick<TourRow, 'fixedDepartures'>, departureDate: Date): FixedDeparture | undefined {
  const departures = Array.isArray(tour.fixedDepartures) ? (tour.fixedDepartures as FixedDeparture[]) : [];
  return departures.find((dep) => dep?.startDate && sameCalendarDay(new Date(dep.startDate), departureDate));
}

export class ItineraryRequestService {
  /**
   * Idempotently syncs itineraryPartnerRequests with the tour's current
   * itinerary-partner links x fixed departures. Called after a tour's
   * itinerary partners or fixedDepartures change. Never overwrites a
   * request the partner has already responded to — only creates missing
   * ones, refreshes the headcount ask on still-pending ones, and removes
   * requests that are stale (partner unlinked / departure removed) and
   * still pending.
   */
  static async reconcileFixedDepartureRequests(tourId: string): Promise<void> {
    const [tour] = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) return;

    const partnerLinks = await db
      .select()
      .from(tourItineraryPartners)
      .where(and(eq(tourItineraryPartners.tourId, tourId), sql`${tourItineraryPartners.businessPartnerId} IS NOT NULL`));

    const departures = (Array.isArray(tour.fixedDepartures) ? (tour.fixedDepartures as FixedDeparture[]) : [])
      .filter((dep) => dep?.startDate && new Date(dep.startDate).getTime() > Date.now());

    type DesiredKey = { tourItineraryPartnerId: string; serviceDate: string; serviceTime: string | null };
    const desired: Array<DesiredKey & { link: ItineraryPartnerRow; headcount: number; sourceDepartureDate: Date }> = [];

    for (const link of partnerLinks) {
      const dayIndex = getItineraryDayIndex(tour, link.dayId);
      if (dayIndex < 0) continue;
      const serviceTime = getItineraryPartnerServiceTime(tour, link.dayId, link.role) ?? null;

      for (const dep of departures) {
        const start = new Date(dep.startDate);
        const serviceDate = toDateString(addDays(start, dayIndex));
        const headcount = dep.maxPax ?? tour.maxSize ?? 0;
        desired.push({ tourItineraryPartnerId: link.id, serviceDate, serviceTime, link, headcount, sourceDepartureDate: start });
      }
    }

    if (desired.length > 0) {
      await db.transaction(async (tx) => {
        for (const d of desired) {
          const [existing] = await tx
            .select({ id: itineraryPartnerRequests.id, status: itineraryPartnerRequests.status })
            .from(itineraryPartnerRequests)
            .where(and(
              eq(itineraryPartnerRequests.tourItineraryPartnerId, d.tourItineraryPartnerId),
              eq(itineraryPartnerRequests.serviceDate, d.serviceDate),
              d.serviceTime === null ? sql`${itineraryPartnerRequests.serviceTime} IS NULL` : eq(itineraryPartnerRequests.serviceTime, d.serviceTime),
            ))
            .limit(1);

          if (!existing) {
            const [created] = await tx.insert(itineraryPartnerRequests).values({
              tourId,
              tourItineraryPartnerId: d.tourItineraryPartnerId,
              businessPartnerId: d.link.businessPartnerId!,
              role: d.link.role,
              serviceDate: d.serviceDate,
              serviceTime: d.serviceTime,
              headcount: d.headcount,
              sourceDepartureDate: d.sourceDepartureDate,
            }).returning({ id: itineraryPartnerRequests.id });

            try {
              await notifyPartnerOfNewRequest(created.id);
            } catch (err) {
              console.error('Failed to notify partner of new itinerary request:', err);
            }
          } else if (existing.status === 'pending') {
            // Refresh the ask if the seller changed maxPax/maxSize since — never
            // touch a request the partner has already confirmed or declined.
            await tx.update(itineraryPartnerRequests)
              .set({ headcount: d.headcount, updatedAt: new Date() })
              .where(eq(itineraryPartnerRequests.id, existing.id));
          }
        }
      });
    }

    // Clean up requests left over from a removed partner link or removed
    // fixed departure — only ever the still-pending, untouched ones.
    const desiredKeySet = new Set(desired.map((d) => `${d.tourItineraryPartnerId}|${d.serviceDate}|${d.serviceTime ?? ''}`));
    const staleCandidates = await db
      .select({ id: itineraryPartnerRequests.id, tourItineraryPartnerId: itineraryPartnerRequests.tourItineraryPartnerId, serviceDate: itineraryPartnerRequests.serviceDate, serviceTime: itineraryPartnerRequests.serviceTime })
      .from(itineraryPartnerRequests)
      .where(and(
        eq(itineraryPartnerRequests.tourId, tourId),
        eq(itineraryPartnerRequests.status, 'pending'),
        sql`${itineraryPartnerRequests.sourceDepartureDate} IS NOT NULL`,
      ));

    const staleIds = staleCandidates
      .filter((r) => !desiredKeySet.has(`${r.tourItineraryPartnerId}|${r.serviceDate}|${r.serviceTime ?? ''}`))
      .map((r) => r.id);

    if (staleIds.length > 0) {
      await db.delete(itineraryPartnerRequests).where(inArray(itineraryPartnerRequests.id, staleIds));
    }
  }

  /**
   * For a booking on a date that ISN'T one of the tour's fixed departures
   * (a flexible/open date), upserts a request per linked partner and
   * records this booking's contribution so headcount always equals the
   * sum of real bookings behind it. If a partner had already confirmed a
   * smaller headcount than this pushes it to, flips them back to pending —
   * they're being asked to hold more capacity than they agreed to.
   */
  static async generateOrUpdateRequestsForBooking(booking: BookingRow): Promise<void> {
    const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId)).limit(1);
    if (!tour) return;
    if (findMatchingFixedDeparture(tour, new Date(booking.departureDate))) return; // covered by the fixed-departure flow instead

    const partnerLinks = await db
      .select()
      .from(tourItineraryPartners)
      .where(and(eq(tourItineraryPartners.tourId, tour.id), sql`${tourItineraryPartners.businessPartnerId} IS NOT NULL`));

    const participants = booking.participants as { adults: number; children: number; infants: number };
    const headcount = (participants?.adults || 0) + (participants?.children || 0);
    if (headcount <= 0 || partnerLinks.length === 0) return;

    for (const link of partnerLinks) {
      const dayIndex = getItineraryDayIndex(tour, link.dayId);
      if (dayIndex < 0) continue;
      const serviceDate = toDateString(addDays(new Date(booking.departureDate), dayIndex));
      const serviceTime = getItineraryPartnerServiceTime(tour, link.dayId, link.role) ?? null;

      const [existing] = await db
        .select()
        .from(itineraryPartnerRequests)
        .where(and(
          eq(itineraryPartnerRequests.tourItineraryPartnerId, link.id),
          eq(itineraryPartnerRequests.serviceDate, serviceDate),
          serviceTime === null ? sql`${itineraryPartnerRequests.serviceTime} IS NULL` : eq(itineraryPartnerRequests.serviceTime, serviceTime),
        ))
        .limit(1);

      let requestId: string;
      let isNew = false;
      if (!existing) {
        const [created] = await db.insert(itineraryPartnerRequests).values({
          tourId: tour.id,
          tourItineraryPartnerId: link.id,
          businessPartnerId: link.businessPartnerId!,
          role: link.role,
          serviceDate,
          serviceTime,
          headcount: 0,
        }).returning({ id: itineraryPartnerRequests.id });
        requestId = created.id;
        isNew = true;
      } else {
        requestId = existing.id;
      }

      await db.insert(itineraryRequestBookingContributions)
        .values({ requestId, bookingId: booking.id, headcount })
        .onConflictDoNothing();

      const [{ total }] = await db
        .select({ total: sql<number>`COALESCE(SUM(${itineraryRequestBookingContributions.headcount}), 0)` })
        .from(itineraryRequestBookingContributions)
        .where(eq(itineraryRequestBookingContributions.requestId, requestId));

      const needsReconfirm = existing?.status === 'confirmed' && Number(total) > (existing.capacityConfirmed ?? 0);
      await db.update(itineraryPartnerRequests)
        .set({ headcount: Number(total), status: needsReconfirm ? 'pending' : undefined, updatedAt: new Date() })
        .where(eq(itineraryPartnerRequests.id, requestId));

      try {
        if (isNew) await notifyPartnerOfNewRequest(requestId);
        else if (needsReconfirm) await notifyPartnerOfNewRequest(requestId);
      } catch (err) {
        console.error('Failed to notify partner of itinerary request update:', err);
      }
    }
  }

  /** Called when a booking is cancelled — removes exactly what it contributed and recomputes the affected request(s). */
  static async removeContributionForBooking(bookingId: string): Promise<void> {
    const contributions = await db
      .select()
      .from(itineraryRequestBookingContributions)
      .where(eq(itineraryRequestBookingContributions.bookingId, bookingId));
    if (contributions.length === 0) return;

    for (const contribution of contributions) {
      await db.delete(itineraryRequestBookingContributions).where(eq(itineraryRequestBookingContributions.id, contribution.id));

      const [{ total }] = await db
        .select({ total: sql<number>`COALESCE(SUM(${itineraryRequestBookingContributions.headcount}), 0)` })
        .from(itineraryRequestBookingContributions)
        .where(eq(itineraryRequestBookingContributions.requestId, contribution.requestId));

      const [request] = await db.select().from(itineraryPartnerRequests).where(eq(itineraryPartnerRequests.id, contribution.requestId)).limit(1);
      if (!request) continue;

      // Nothing left behind a still-pending, purely booking-driven request — drop it.
      if (Number(total) === 0 && request.status === 'pending' && !request.sourceDepartureDate) {
        await db.delete(itineraryPartnerRequests).where(eq(itineraryPartnerRequests.id, request.id));
      } else {
        await db.update(itineraryPartnerRequests)
          .set({ headcount: Number(total), updatedAt: new Date() })
          .where(eq(itineraryPartnerRequests.id, request.id));
      }
    }
  }

  /** True iff every fixed-departure-sourced request for this exact date is confirmed (vacuously true if there are none — nothing to gate on). */
  static async isFixedDepartureDateConfirmed(tourId: string, departureDate: Date): Promise<boolean> {
    const dateStr = toDateString(departureDate);
    const [{ value: unconfirmedCount }] = await db
      .select({ value: sql<number>`count(*)` })
      .from(itineraryPartnerRequests)
      .where(and(
        eq(itineraryPartnerRequests.tourId, tourId),
        sql`${itineraryPartnerRequests.sourceDepartureDate}::date = ${dateStr}::date`,
        ne(itineraryPartnerRequests.status, 'confirmed'),
      ));
    return Number(unconfirmedCount) === 0;
  }

  /** Seller (tour author) or admin: every request for this tour, with the partner's name, for a read-only logistics-status panel on the tour editor. */
  static async getRequestsForTour(tourId: string, requester: { id: string; isAdmin: boolean }) {
    if (!requester.isAdmin) {
      const [owned] = await db
        .select({ tourId: tourAuthors.tourId })
        .from(tourAuthors)
        .where(and(eq(tourAuthors.tourId, tourId), eq(tourAuthors.userId, requester.id)))
        .limit(1);
      if (!owned) throw createHttpError(403, 'You do not have access to this tour\'s logistics status');
    }

    return db
      .select({ request: itineraryPartnerRequests, partnerName: businessPartners.name, partnerType: businessPartners.type })
      .from(itineraryPartnerRequests)
      .innerJoin(businessPartners, eq(itineraryPartnerRequests.businessPartnerId, businessPartners.id))
      .where(eq(itineraryPartnerRequests.tourId, tourId))
      .then((rows) => rows.map(({ request, partnerName, partnerType }) => ({ ...request, partnerName, partnerType })));
  }

  /** Owner-or-admin gated confirm/decline, with capacity validated against the partner's remaining capacity for that date. */
  static async respondToRequest(
    requestId: string,
    requester: { id: string; isAdmin: boolean },
    status: 'confirmed' | 'declined',
    capacityConfirmed?: number,
    notes?: string,
  ) {
    const [request] = await db.select().from(itineraryPartnerRequests).where(eq(itineraryPartnerRequests.id, requestId)).limit(1);
    if (!request) throw createHttpError(404, 'Request not found');

    const [partner] = await db.select({ ownerId: businessPartners.ownerId, name: businessPartners.name }).from(businessPartners).where(eq(businessPartners.id, request.businessPartnerId)).limit(1);
    if (!partner) throw createHttpError(404, 'Business not found');
    if (!requester.isAdmin && partner.ownerId !== requester.id) {
      throw createHttpError(403, 'Not authorized to respond to this request');
    }

    if (status === 'confirmed') {
      if (capacityConfirmed === undefined || capacityConfirmed < 0) {
        throw createHttpError(400, 'capacityConfirmed is required to confirm a request');
      }
      const available = await ItineraryRequestService.getAvailableCapacity(request.businessPartnerId, request.serviceDate, requestId);
      if (capacityConfirmed > available) {
        throw createHttpError(400, `Only ${available} available on ${request.serviceDate} — cannot confirm ${capacityConfirmed}`);
      }
    }

    const [updated] = await db.update(itineraryPartnerRequests).set({
      status,
      capacityConfirmed: status === 'confirmed' ? capacityConfirmed : null,
      responseNotes: notes ?? null,
      respondedAt: new Date(),
      respondedBy: requester.id,
      updatedAt: new Date(),
    }).where(eq(itineraryPartnerRequests.id, requestId)).returning();

    try {
      await notifySellersOfResponse(updated, partner.name, status);
    } catch (err) {
      console.error('Failed to notify sellers of itinerary request response:', err);
    }

    return updated;
  }

  /** Total capacity for (partner, date) minus what's already confirmed on OTHER requests for that same date. */
  static async getAvailableCapacity(businessPartnerId: string, serviceDate: string, excludingRequestId?: string): Promise<number> {
    const [override] = await db.select({ capacity: businessPartnerCapacityOverrides.capacity }).from(businessPartnerCapacityOverrides)
      .where(and(eq(businessPartnerCapacityOverrides.businessPartnerId, businessPartnerId), eq(businessPartnerCapacityOverrides.date, serviceDate)))
      .limit(1);
    const [policy] = await db.select({ defaultDailyCapacity: businessPartnerCapacity.defaultDailyCapacity }).from(businessPartnerCapacity)
      .where(eq(businessPartnerCapacity.businessPartnerId, businessPartnerId)).limit(1);
    const total = override?.capacity ?? policy?.defaultDailyCapacity ?? 0;

    const conditions = [
      eq(itineraryPartnerRequests.businessPartnerId, businessPartnerId),
      eq(itineraryPartnerRequests.serviceDate, serviceDate),
      eq(itineraryPartnerRequests.status, 'confirmed'),
    ];
    if (excludingRequestId) conditions.push(ne(itineraryPartnerRequests.id, excludingRequestId));

    const [{ reserved }] = await db
      .select({ reserved: sql<number>`COALESCE(SUM(${itineraryPartnerRequests.capacityConfirmed}), 0)` })
      .from(itineraryPartnerRequests)
      .where(and(...conditions));

    return Math.max(0, total - Number(reserved));
  }
}

async function notifyPartnerOfNewRequest(requestId: string): Promise<void> {
  const [row] = await db
    .select({ request: itineraryPartnerRequests, ownerId: businessPartners.ownerId, tourTitle: tours.title })
    .from(itineraryPartnerRequests)
    .innerJoin(businessPartners, eq(itineraryPartnerRequests.businessPartnerId, businessPartners.id))
    .innerJoin(tours, eq(itineraryPartnerRequests.tourId, tours.id))
    .where(eq(itineraryPartnerRequests.id, requestId))
    .limit(1);
  if (!row) return;
  await notifications.createItineraryRequestCreatedNotification(row.ownerId, row.tourTitle, row.request.serviceDate, row.request.id);
}

async function notifySellersOfResponse(request: typeof itineraryPartnerRequests.$inferSelect, partnerName: string, status: 'confirmed' | 'declined'): Promise<void> {
  const authors = await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(eq(tourAuthors.tourId, request.tourId));
  for (const { userId } of authors) {
    if (status === 'confirmed') {
      await notifications.createItineraryRequestConfirmedNotification(userId, partnerName, request.serviceDate, request.id);
    } else {
      await notifications.createItineraryRequestDeclinedNotification(userId, partnerName, request.serviceDate, request.id);
    }
  }
}
