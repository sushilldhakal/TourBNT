import {
  db,
  tours,
  tourItineraryPartners,
  itineraryPartnerRequests,
  itineraryRequestEvents,
  itineraryRequestBookingContributions,
  businessPartnerCapacity,
  businessPartnerCapacityOverrides,
  businessPartnerUnitTypes,
  businessPartnerUnitTypeBlocks,
  businessPartnerAvailabilityBlocks,
  businessPartners,
  tourAuthors,
  bookings,
} from '@tourbnt/db';
import { eq, and, or, inArray, sql, ne, lt } from 'drizzle-orm';
import createHttpError from 'http-errors';
import * as notifications from '../../notifications/notificationController';

type TourRow = typeof tours.$inferSelect;
type BookingRow = typeof bookings.$inferSelect;
type ItineraryPartnerRow = typeof tourItineraryPartners.$inferSelect;
type RequestRow = typeof itineraryPartnerRequests.$inferSelect;
type RequestStatus = RequestRow['status'];

const HOLD_DURATION_MS = 48 * 60 * 60 * 1000;
const RESPOND_BY_MS = 72 * 60 * 60 * 1000;

interface FixedDeparture {
  startDate: Date;
  /** Seats this departure can hold. Undefined when the seller didn't set one — callers fall back to tour.maxSize. */
  capacity?: number;
}

interface TourDatesShape {
  scheduleType?: string;
  defaultDateRange?: { from?: string | Date; to?: string | Date } | null;
  departures?: Array<{ dateRange?: { from?: string | Date; to?: string | Date } | null; capacity?: number }>;
}

/**
 * The tour's real, agency-authored departure dates — read from
 * `tours.tourDates` (written by the tour editor's date-scheduling step),
 * NOT the legacy `tours.fixedDepartures` column, which nothing in the
 * frontend ever populates. A 'multiple' schedule contributes one entry per
 * departure (each with its own capacity); a 'fixed' schedule contributes
 * its single date range with no per-date capacity override (falls back to
 * tour.maxSize downstream). 'flexible'/'recurring' tours have no fixed
 * dates to gate — bookings on those go through generateOrUpdateRequestsForBooking instead.
 */
function getFixedDepartures(tour: Pick<TourRow, 'tourDates'>): FixedDeparture[] {
  const tourDates = (tour.tourDates ?? null) as TourDatesShape | null;
  if (!tourDates) return [];

  if (tourDates.scheduleType === 'multiple') {
    return (tourDates.departures ?? [])
      .filter((d) => d?.dateRange?.from)
      .map((d) => ({
        startDate: new Date(d.dateRange!.from!),
        capacity: typeof d.capacity === 'number' ? d.capacity : undefined,
      }));
  }

  if (tourDates.scheduleType === 'fixed' && tourDates.defaultDateRange?.from) {
    return [{ startDate: new Date(tourDates.defaultDateRange.from) }];
  }

  return [];
}

const toDateString = (d: Date): string => d.toISOString().slice(0, 10);

const addDays = (d: Date, days: number): Date => {
  const copy = new Date(d);
  // UTC, to match toDateString — local-time setDate repeats/skips a date across a DST change.
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const sameCalendarDay = (a: Date, b: Date): boolean => toDateString(a) === toDateString(b);

/** Finds the array index of the itinerary day whose `id` matches `dayId`, or -1 if the day was removed/reordered away. */
function getItineraryDayIndex(tour: Pick<TourRow, 'itinerary'>, dayId: string): number {
  const itinerary = Array.isArray(tour.itinerary) ? (tour.itinerary as Array<{ id?: string }>) : [];
  return itinerary.findIndex((day) => day?.id === dayId);
}

/**
 * Optional "HH:mm" time window the seller set on this day's partner entry
 * for this role — a single sitting point for meals (`time` only), or a
 * start/end engagement window for guides (`time` + `endTime`).
 */
function getItineraryPartnerServiceTime(tour: Pick<TourRow, 'itinerary'>, dayId: string, role: string): { time?: string; endTime?: string } {
  const itinerary = Array.isArray(tour.itinerary) ? (tour.itinerary as Array<{ id?: string; partners?: Array<{ role?: string; time?: string; endTime?: string }> }>) : [];
  const day = itinerary.find((d) => d?.id === dayId);
  const partner = day?.partners?.find((p) => p?.role === role);
  return { time: partner?.time || undefined, endTime: partner?.endTime || undefined };
}

/** The fixed departure (if any) whose startDate falls on the same calendar day as `departureDate`. */
export function findMatchingFixedDeparture(tour: Pick<TourRow, 'tourDates'>, departureDate: Date): FixedDeparture | undefined {
  return getFixedDepartures(tour).find((dep) => sameCalendarDay(dep.startDate, departureDate));
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

    const departures = getFixedDepartures(tour).filter((dep) => dep.startDate.getTime() > Date.now());

    type DesiredKey = { tourItineraryPartnerId: string; serviceDate: string; serviceTime: string | null; serviceEndTime: string | null };
    const desired: Array<DesiredKey & { link: ItineraryPartnerRow; headcount: number; unitsRequested: number; sourceDepartureDate: Date }> = [];

    for (const link of partnerLinks) {
      const dayIndex = getItineraryDayIndex(tour, link.dayId);
      if (dayIndex < 0) continue;
      const { time: serviceTimeRaw, endTime } = getItineraryPartnerServiceTime(tour, link.dayId, link.role);
      const serviceTime = serviceTimeRaw ?? null;
      const serviceEndTime = endTime ?? null;

      for (const dep of departures) {
        const serviceDate = toDateString(addDays(dep.startDate, dayIndex));
        const headcount = dep.capacity ?? tour.maxSize ?? 0;
        // The agency's own stated quantity for this link wins when set
        // (e.g. "10 rooms" for accommodation); otherwise fall back to the
        // departure's/tour's traveler count, same as headcount.
        const unitsRequested = link.unitsRequested ?? headcount;
        desired.push({ tourItineraryPartnerId: link.id, serviceDate, serviceTime, serviceEndTime, link, headcount, unitsRequested, sourceDepartureDate: dep.startDate });
      }
    }

    if (desired.length > 0) {
      // One read of what already exists, then compare in memory and write in bulk.
      // This used to run a SELECT (plus INSERTs) per link x departure inside one
      // transaction — ~200 sequential round trips to the remote database for a
      // 15-day tour, which made every tour save hang for minutes.
      const existingRows = await db
        .select({ id: itineraryPartnerRequests.id, status: itineraryPartnerRequests.status, tourItineraryPartnerId: itineraryPartnerRequests.tourItineraryPartnerId, serviceDate: itineraryPartnerRequests.serviceDate, serviceTime: itineraryPartnerRequests.serviceTime, headcount: itineraryPartnerRequests.headcount, unitsRequested: itineraryPartnerRequests.unitsRequested, unitTypeId: itineraryPartnerRequests.unitTypeId })
        .from(itineraryPartnerRequests)
        .where(eq(itineraryPartnerRequests.tourId, tourId));
      const keyOfRow = (r: { tourItineraryPartnerId: string; serviceDate: string; serviceTime: string | null }) => `${r.tourItineraryPartnerId}|${r.serviceDate}|${r.serviceTime ?? ''}`;
      const existingByKey = new Map(existingRows.map((r) => [keyOfRow(r), r]));

      const toCreate = desired.filter((d) => !existingByKey.has(keyOfRow(d)));
      const toRefresh = desired.filter((d) => {
        const e = existingByKey.get(keyOfRow(d));
        // Refresh the ask if the seller changed capacity/maxSize/quantity since —
        // never touch a request the partner has already responded to.
        return e && e.status === 'pending' && (e.headcount !== d.headcount || e.unitsRequested !== d.unitsRequested || (e.unitTypeId ?? null) !== (d.link.unitTypeId ?? null));
      });

      const createdIds: string[] = [];
      for (let k = 0; k < toCreate.length; k += 100) {
        const part = toCreate.slice(k, k + 100);
        const created = await db.insert(itineraryPartnerRequests).values(part.map((d) => ({
          tourId,
          tourItineraryPartnerId: d.tourItineraryPartnerId,
          businessPartnerId: d.link.businessPartnerId!,
          role: d.link.role,
          serviceDate: d.serviceDate,
          serviceTime: d.serviceTime,
          serviceEndTime: d.serviceEndTime,
          headcount: d.headcount,
          unitsRequested: d.unitsRequested,
          unitTypeId: d.link.unitTypeId,
          respondByAt: new Date(Date.now() + RESPOND_BY_MS),
          sourceDepartureDate: d.sourceDepartureDate,
        }))).returning({ id: itineraryPartnerRequests.id });
        await db.insert(itineraryRequestEvents).values(created.map((c, idx) => ({
          requestId: c.id, fromStatus: null, toStatus: 'pending' as const,
          actorRole: 'system' as const, unitsAtEvent: part[idx].unitsRequested, notes: 'Auto-generated from fixed departure',
        })));
        createdIds.push(...created.map((c) => c.id));
      }

      await Promise.all(toRefresh.map((d) => db.update(itineraryPartnerRequests)
        .set({ headcount: d.headcount, unitsRequested: d.unitsRequested, unitTypeId: d.link.unitTypeId, updatedAt: new Date() })
        .where(eq(itineraryPartnerRequests.id, existingByKey.get(keyOfRow(d))!.id))));

      // Partner notifications are best-effort and must not hold up the save.
      void (async () => {
        for (let k = 0; k < createdIds.length; k += 10) {
          await Promise.all(createdIds.slice(k, k + 10).map((id) => notifyPartnerOfNewRequest(id).catch((err) => console.error('Failed to notify partner of new itinerary request:', err))));
        }
      })();
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
      const { time: serviceTimeRaw, endTime } = getItineraryPartnerServiceTime(tour, link.dayId, link.role);
      const serviceTime = serviceTimeRaw ?? null;
      const serviceEndTime = endTime ?? null;

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
          serviceEndTime,
          headcount: 0,
          unitsRequested: 0,
          unitTypeId: link.unitTypeId,
          respondByAt: new Date(Date.now() + RESPOND_BY_MS),
        }).returning({ id: itineraryPartnerRequests.id });
        requestId = created.id;
        isNew = true;
        await logEvent(requestId, null, 'pending', null, 'system', 0, 'Auto-generated from booking');
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

      // For a flexible-date tour, headcount (people) and unitsRequested (the
      // quantity reserved against the partner's pool) are the same number —
      // there's no separate agency-authored room/seat count on this path.
      const needsReconfirm = existing?.status === 'confirmed' && Number(total) > (existing.capacityConfirmed ?? 0);
      await db.update(itineraryPartnerRequests)
        .set({
          headcount: Number(total),
          unitsRequested: Number(total),
          status: needsReconfirm ? 'pending' : undefined,
          holdExpiresAt: needsReconfirm ? null : undefined,
          updatedAt: new Date(),
        })
        .where(eq(itineraryPartnerRequests.id, requestId));

      if (needsReconfirm && existing) {
        await logEvent(requestId, existing.status, 'pending', null, 'system', Number(total), 'Booking increased headcount past what was confirmed — reconfirmation needed');
      }

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
          .set({ headcount: Number(total), unitsRequested: Number(total), updatedAt: new Date() })
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

  /** Admin, or a tourAuthors row for the tour — else 403. Shared by every agency-facing method below. */
  static async assertTourAuthorOrAdmin(tourId: string, requester: { id: string; isAdmin: boolean }): Promise<void> {
    if (requester.isAdmin) return;
    const [owned] = await db
      .select({ tourId: tourAuthors.tourId })
      .from(tourAuthors)
      .where(and(eq(tourAuthors.tourId, tourId), eq(tourAuthors.userId, requester.id)))
      .limit(1);
    if (!owned) throw createHttpError(403, 'You do not have access to this tour');
  }

  /**
   * Seller (tour author) or admin: every request for this tour, with the
   * partner's name, plus a synthetic "not yet requested" row for any linked
   * partner that has no request at all — the agency orchestrator table
   * shows these with a "Send request" action.
   */
  static async getRequestsForTour(tourId: string, requester: { id: string; isAdmin: boolean }) {
    // All four reads are independent, so they run together — one round trip instead of four in a
    // row (~3s on the remote DB for a 15-day tour). Events are selected by tour via a sub-select
    // rather than waiting for the request ids. The access check still gates the response.
    const [, requestedRows, events, links] = await Promise.all([
      ItineraryRequestService.assertTourAuthorOrAdmin(tourId, requester),
      db
        .select({ request: itineraryPartnerRequests, partnerName: businessPartners.name, partnerType: businessPartners.type })
        .from(itineraryPartnerRequests)
        .innerJoin(businessPartners, eq(itineraryPartnerRequests.businessPartnerId, businessPartners.id))
        .where(eq(itineraryPartnerRequests.tourId, tourId)),
      db
        .select()
        .from(itineraryRequestEvents)
        .where(inArray(itineraryRequestEvents.requestId, db.select({ id: itineraryPartnerRequests.id }).from(itineraryPartnerRequests).where(eq(itineraryPartnerRequests.tourId, tourId))))
        .orderBy(itineraryRequestEvents.createdAt),
      db
        .select({ link: tourItineraryPartners, partnerName: businessPartners.name, partnerType: businessPartners.type })
        .from(tourItineraryPartners)
        .innerJoin(businessPartners, eq(tourItineraryPartners.businessPartnerId, businessPartners.id))
        .where(and(eq(tourItineraryPartners.tourId, tourId), sql`${tourItineraryPartners.businessPartnerId} IS NOT NULL`)),
    ]);

    const eventsByRequest = new Map<string, typeof events>();
    for (const e of events) {
      const list = eventsByRequest.get(e.requestId) || [];
      list.push(e);
      eventsByRequest.set(e.requestId, list);
    }

    const linkById = new Map(links.map((l) => [l.link.id, l.link]));

    const requested = requestedRows.map(({ request, partnerName, partnerType }) => ({
      ...request,
      partnerName,
      partnerType,
      unitType: linkById.get(request.tourItineraryPartnerId)?.unitType ?? null,
      events: eventsByRequest.get(request.id) ?? [],
    }));

    const linkedPartnerIds = new Set(requested.map((r) => r.tourItineraryPartnerId));

    const unrequested = links
      .filter((l) => !linkedPartnerIds.has(l.link.id))
      .map((l) => ({
        id: null as string | null,
        tourId,
        tourItineraryPartnerId: l.link.id,
        businessPartnerId: l.link.businessPartnerId,
        role: l.link.role,
        serviceDate: null as string | null,
        serviceTime: null as string | null,
        headcount: 0,
        unitsRequested: l.link.unitsRequested ?? 0,
        unitType: l.link.unitType ?? null,
        status: null as RequestStatus | null,
        partnerName: l.partnerName,
        partnerType: l.partnerType,
        events: [] as typeof events,
      }));

    return [...requested, ...unrequested];
  }

  /**
   * A customer's own view of their booking: every itinerary day with the
   * live status of each supplier tied to that day's real calendar date —
   * computed the same way request generation does (booking.departureDate +
   * the day's array index), so this works identically for fixed-departure
   * and flexible/booking-driven tours without branching on schedule type.
   */
  static async getBookingTimeline(bookingId: string, requester: { id: string; isAdmin: boolean }) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) throw createHttpError(404, 'Booking not found');
    if (!requester.isAdmin && booking.userId !== requester.id) {
      throw createHttpError(403, 'You do not have access to this booking');
    }

    const [tour] = await db.select({ itinerary: tours.itinerary }).from(tours).where(eq(tours.id, booking.tourId)).limit(1);
    if (!tour) throw createHttpError(404, 'Tour not found');

    const itinerary = Array.isArray(tour.itinerary)
      ? (tour.itinerary as Array<{ id?: string; title?: string; description?: string; destination?: string }>)
      : [];

    const links = await db
      .select({ link: tourItineraryPartners, partnerName: businessPartners.name })
      .from(tourItineraryPartners)
      .innerJoin(businessPartners, eq(tourItineraryPartners.businessPartnerId, businessPartners.id))
      .where(and(eq(tourItineraryPartners.tourId, booking.tourId), sql`${tourItineraryPartners.businessPartnerId} IS NOT NULL`));

    const linksByDayId = new Map<string, typeof links>();
    for (const l of links) {
      const list = linksByDayId.get(l.link.dayId) || [];
      list.push(l);
      linksByDayId.set(l.link.dayId, list);
    }

    const dayDates = itinerary.map((day, dayIndex) => ({
      dayId: day?.id,
      dayIndex,
      date: toDateString(addDays(new Date(booking.departureDate), dayIndex)),
    }));

    const dateStrings = [...new Set(dayDates.map((d) => d.date))];
    const requestRows = dateStrings.length
      ? await db
          .select()
          .from(itineraryPartnerRequests)
          .where(and(eq(itineraryPartnerRequests.tourId, booking.tourId), inArray(itineraryPartnerRequests.serviceDate, dateStrings)))
      : [];

    const requestsByLinkAndDate = new Map<string, RequestRow>();
    for (const request of requestRows) {
      requestsByLinkAndDate.set(`${request.tourItineraryPartnerId}:${request.serviceDate}`, request);
    }

    return itinerary.map((day, dayIndex) => {
      const dayId = day?.id;
      const date = dayDates[dayIndex]?.date ?? null;
      const dayLinks = dayId ? linksByDayId.get(dayId) ?? [] : [];

      const partners = dayLinks.map(({ link, partnerName }) => {
        const request = date ? requestsByLinkAndDate.get(`${link.id}:${date}`) : undefined;
        return {
          role: link.role,
          businessPartnerId: link.businessPartnerId,
          businessPartnerName: partnerName,
          unitType: link.unitType ?? null,
          status: (request?.status ?? 'unscheduled') as RequestStatus | 'unscheduled',
          serviceTime: request?.serviceTime ?? null,
          serviceEndTime: request?.serviceEndTime ?? null,
          holdExpiresAt: request?.holdExpiresAt ?? null,
          respondByAt: request?.respondByAt ?? null,
        };
      });

      return {
        dayId: dayId ?? null,
        dayIndex,
        date,
        title: day?.title ?? '',
        description: day?.description ?? '',
        destination: day?.destination ?? null,
        partners,
      };
    });
  }

  /**
   * Partner (owner-or-admin) responds to a request they're holding a
   * decision on. `action` replaces the old binary confirmed/declined:
   *  - hold: tentatively reserve `units`, expiring at holdExpiresAt unless promoted.
   *  - confirm: lock in `units` for good — allowed straight from pending, or promoting a hold.
   *  - decline: refuse outright.
   *  - counter: propose different units/date/time back to the agency (see respondToCounter).
   * hold/confirm both re-validate against getAvailableCapacity so two
   * simultaneous responses can't jointly over-commit the partner's pool.
   */
  static async respondToRequest(
    requestId: string,
    requester: { id: string; isAdmin: boolean },
    action: 'hold' | 'confirm' | 'decline' | 'counter',
    params: { units?: number; notes?: string; counterUnits?: number; counterDate?: string; counterTime?: string } = {},
  ) {
    const [request] = await db.select().from(itineraryPartnerRequests).where(eq(itineraryPartnerRequests.id, requestId)).limit(1);
    if (!request) throw createHttpError(404, 'Request not found');

    const [partner] = await db.select({ ownerId: businessPartners.ownerId, name: businessPartners.name, type: businessPartners.type }).from(businessPartners).where(eq(businessPartners.id, request.businessPartnerId)).limit(1);
    if (!partner) throw createHttpError(404, 'Business not found');
    if (!requester.isAdmin && partner.ownerId !== requester.id) {
      throw createHttpError(403, 'Not authorized to respond to this request');
    }

    const fromStatus = request.status;
    let toStatus: RequestStatus;
    let patch: Partial<typeof itineraryPartnerRequests.$inferInsert>;

    if (action === 'hold' || action === 'confirm') {
      if (action === 'hold' && fromStatus !== 'pending') {
        throw createHttpError(400, `Cannot hold a request that is currently ${fromStatus}`);
      }
      if (action === 'confirm' && fromStatus !== 'pending' && fromStatus !== 'held') {
        throw createHttpError(400, `Cannot confirm a request that is currently ${fromStatus}`);
      }
      if (params.units === undefined || params.units < 0) {
        throw createHttpError(400, 'units is required');
      }
      // A guide is one person, not a count of identical resources — check
      // for a real time-window conflict instead of pooling against a daily
      // number, so two non-overlapping half-day bookings never falsely block
      // each other. Everyone else keeps the pooled-count check.
      if (partner.type === 'guide') {
        if (!request.serviceTime || !request.serviceEndTime) {
          throw createHttpError(400, 'This request has no start/end time to check availability against');
        }
        const isAvailable = await ItineraryRequestService.isTimeSlotAvailable(request.businessPartnerId, request.serviceDate, request.serviceTime, request.serviceEndTime, requestId);
        if (!isAvailable) {
          throw createHttpError(400, `Not available on ${request.serviceDate} between ${request.serviceTime} and ${request.serviceEndTime}`);
        }
        const [capacityPolicy] = await db.select({ defaultDailyCapacity: businessPartnerCapacity.defaultDailyCapacity }).from(businessPartnerCapacity)
          .where(eq(businessPartnerCapacity.businessPartnerId, request.businessPartnerId)).limit(1);
        if (capacityPolicy?.defaultDailyCapacity && params.units > capacityPolicy.defaultDailyCapacity) {
          throw createHttpError(400, `This exceeds your group-size limit of ${capacityPolicy.defaultDailyCapacity}`);
        }
      } else {
        const available = await ItineraryRequestService.getAvailableCapacity(request.businessPartnerId, request.serviceDate, requestId, request.unitTypeId);
        if (params.units > available) {
          throw createHttpError(400, `Only ${available} available on ${request.serviceDate} — cannot commit ${params.units}`);
        }
      }
      toStatus = action === 'hold' ? 'held' : 'confirmed';
      patch = {
        status: toStatus,
        capacityConfirmed: params.units,
        responseNotes: params.notes ?? null,
        respondedAt: new Date(),
        respondedBy: requester.id,
        holdExpiresAt: action === 'hold' ? new Date(Date.now() + HOLD_DURATION_MS) : null,
        counterUnits: null, counterDate: null, counterTime: null, counterNotes: null,
      };
    } else if (action === 'decline') {
      if (fromStatus !== 'pending' && fromStatus !== 'held' && fromStatus !== 'countered') {
        throw createHttpError(400, `Cannot decline a request that is currently ${fromStatus}`);
      }
      toStatus = 'declined';
      patch = {
        status: 'declined',
        capacityConfirmed: null,
        responseNotes: params.notes ?? null,
        respondedAt: new Date(),
        respondedBy: requester.id,
        holdExpiresAt: null,
        counterUnits: null, counterDate: null, counterTime: null, counterNotes: null,
      };
    } else if (action === 'counter') {
      if (fromStatus !== 'pending') {
        throw createHttpError(400, `Cannot counter a request that is currently ${fromStatus}`);
      }
      if (params.counterUnits === undefined && !params.counterDate && !params.counterTime) {
        throw createHttpError(400, 'Provide at least one of counterUnits, counterDate, or counterTime');
      }
      toStatus = 'countered';
      patch = {
        status: 'countered',
        respondedAt: new Date(),
        respondedBy: requester.id,
        counterUnits: params.counterUnits ?? null,
        counterDate: params.counterDate ?? null,
        counterTime: params.counterTime ?? null,
        counterNotes: params.notes ?? null,
      };
    } else {
      throw createHttpError(400, `Unknown action: ${action}`);
    }

    const updated = await updateRequestWithVersion(requestId, request.version, patch);
    await logEvent(requestId, fromStatus, toStatus, requester.id, 'partner', patch.capacityConfirmed ?? request.unitsRequested, params.notes);

    try {
      await notifyAgencyOfPartnerResponse(updated, partner.name, toStatus);
    } catch (err) {
      console.error('Failed to notify agency of itinerary request response:', err);
    }

    return updated;
  }

  /** Agency (tour author) or admin accepts or declines a partner's counter-offer on a `countered` request. */
  static async respondToCounter(requestId: string, requester: { id: string; isAdmin: boolean }, accept: boolean) {
    const [request] = await db.select().from(itineraryPartnerRequests).where(eq(itineraryPartnerRequests.id, requestId)).limit(1);
    if (!request) throw createHttpError(404, 'Request not found');
    await ItineraryRequestService.assertTourAuthorOrAdmin(request.tourId, requester);
    if (request.status !== 'countered') {
      throw createHttpError(400, `Request is not awaiting a counter-offer response (currently ${request.status})`);
    }

    const [partner] = await db.select({ ownerId: businessPartners.ownerId, type: businessPartners.type }).from(businessPartners).where(eq(businessPartners.id, request.businessPartnerId)).limit(1);

    let toStatus: RequestStatus;
    let patch: Partial<typeof itineraryPartnerRequests.$inferInsert>;

    if (accept) {
      const units = request.counterUnits ?? request.unitsRequested;
      const effectiveDate = request.counterDate ?? request.serviceDate;
      const effectiveTime = request.counterTime ?? request.serviceTime;
      if (partner?.type === 'guide') {
        if (!effectiveTime || !request.serviceEndTime) {
          throw createHttpError(400, 'This request has no start/end time to check availability against');
        }
        const isAvailable = await ItineraryRequestService.isTimeSlotAvailable(request.businessPartnerId, effectiveDate, effectiveTime, request.serviceEndTime, requestId);
        if (!isAvailable) {
          throw createHttpError(400, `Not available on ${effectiveDate} between ${effectiveTime} and ${request.serviceEndTime}`);
        }
      } else {
        const available = await ItineraryRequestService.getAvailableCapacity(request.businessPartnerId, effectiveDate, requestId, request.unitTypeId);
        if (units > available) {
          throw createHttpError(400, `Only ${available} available on ${effectiveDate} — cannot accept ${units}`);
        }
      }
      toStatus = 'held';
      patch = {
        status: 'held',
        serviceDate: effectiveDate,
        serviceTime: effectiveTime,
        unitsRequested: units,
        capacityConfirmed: units,
        holdExpiresAt: new Date(Date.now() + HOLD_DURATION_MS),
        counterUnits: null, counterDate: null, counterTime: null, counterNotes: null,
      };
    } else {
      toStatus = 'declined';
      patch = {
        status: 'declined',
        capacityConfirmed: null,
        holdExpiresAt: null,
        counterUnits: null, counterDate: null, counterTime: null, counterNotes: null,
      };
    }

    const updated = await updateRequestWithVersion(requestId, request.version, patch);
    await logEvent(requestId, 'countered', toStatus, requester.id, 'agency', updated.capacityConfirmed ?? updated.unitsRequested, accept ? 'Agency accepted counter-offer' : 'Agency declined counter-offer');

    // Only the accept path has a fitting notification today (no "your
    // counter was declined" copy exists yet) — the decline is still fully
    // recorded via the status change and the event log above either way.
    if (partner && accept) {
      try {
        const [tour] = await db.select({ title: tours.title }).from(tours).where(eq(tours.id, updated.tourId)).limit(1);
        await notifications.createItineraryRequestHeldNotification(partner.ownerId, tour?.title ?? 'a tour', updated.serviceDate, updated.id);
      } catch (err) {
        console.error('Failed to notify partner of counter-offer acceptance:', err);
      }
    }

    return updated;
  }

  /** Agency/admin: resurrect a `declined`/`expired` request back to `pending` — there's otherwise no path back once a partner says no or a request times out. Backs "replace/re-request" in the orchestrator table. */
  static async reopenRequest(requestId: string, requester: { id: string; isAdmin: boolean }) {
    const [request] = await db.select().from(itineraryPartnerRequests).where(eq(itineraryPartnerRequests.id, requestId)).limit(1);
    if (!request) throw createHttpError(404, 'Request not found');
    await ItineraryRequestService.assertTourAuthorOrAdmin(request.tourId, requester);
    if (request.status !== 'declined' && request.status !== 'expired') {
      throw createHttpError(400, `Only a declined or expired request can be reopened (currently ${request.status})`);
    }

    const updated = await updateRequestWithVersion(requestId, request.version, {
      status: 'pending',
      capacityConfirmed: null,
      holdExpiresAt: null,
      respondByAt: new Date(Date.now() + RESPOND_BY_MS),
      counterUnits: null, counterDate: null, counterTime: null, counterNotes: null,
      responseNotes: null,
    });
    await logEvent(requestId, request.status, 'pending', requester.id, 'agency', request.unitsRequested, 'Reopened by agency');

    try {
      await notifyPartnerOfNewRequest(requestId);
    } catch (err) {
      console.error('Failed to notify partner of reopened request:', err);
    }

    return updated;
  }

  /**
   * Agency/admin: send a request on demand for a link that has no request
   * yet (before any booking, or a tour with no fixed departures) — reads
   * units/unitType off the tourItineraryPartners link itself.
   */
  static async createManualRequest(tourItineraryPartnerId: string, requester: { id: string; isAdmin: boolean }, serviceDate: string, serviceTime?: string, serviceEndTime?: string) {
    const [link] = await db.select().from(tourItineraryPartners).where(eq(tourItineraryPartners.id, tourItineraryPartnerId)).limit(1);
    if (!link) throw createHttpError(404, 'Itinerary partner link not found');
    if (!link.businessPartnerId) throw createHttpError(400, 'This day\'s partner is a free-typed name, not a registered business — link a real business first');
    await ItineraryRequestService.assertTourAuthorOrAdmin(link.tourId, requester);

    const [existing] = await db
      .select({ id: itineraryPartnerRequests.id })
      .from(itineraryPartnerRequests)
      .where(and(
        eq(itineraryPartnerRequests.tourItineraryPartnerId, tourItineraryPartnerId),
        eq(itineraryPartnerRequests.serviceDate, serviceDate),
        serviceTime ? eq(itineraryPartnerRequests.serviceTime, serviceTime) : sql`${itineraryPartnerRequests.serviceTime} IS NULL`,
      ))
      .limit(1);
    if (existing) throw createHttpError(409, 'A request already exists for this partner on this date');

    const unitsRequested = link.unitsRequested ?? 0;
    const [created] = await db.insert(itineraryPartnerRequests).values({
      tourId: link.tourId,
      tourItineraryPartnerId,
      businessPartnerId: link.businessPartnerId,
      role: link.role,
      serviceDate,
      serviceTime: serviceTime ?? null,
      serviceEndTime: serviceEndTime ?? null,
      headcount: unitsRequested,
      unitsRequested,
      unitTypeId: link.unitTypeId,
      respondByAt: new Date(Date.now() + RESPOND_BY_MS),
    }).returning();

    await logEvent(created.id, null, 'pending', requester.id, 'agency', unitsRequested, 'Manually sent by agency');

    try {
      await notifyPartnerOfNewRequest(created.id);
    } catch (err) {
      console.error('Failed to notify partner of manual itinerary request:', err);
    }

    return created;
  }

  /**
   * Agency/admin: swap the business partner linked to a day/role in place —
   * preserves the tourItineraryPartners row's id (and any events history via
   * the request it had) instead of the delete-and-reinsert a normal tour
   * save does, which would silently cascade-delete any live request.
   * Declines any live request against the old partner (with an event note)
   * and creates a fresh pending request for the new one if the old one had
   * a real service date to carry over.
   */
  static async replaceSupplier(tourItineraryPartnerId: string, requester: { id: string; isAdmin: boolean }, businessPartnerId: string, name: string) {
    const [link] = await db.select().from(tourItineraryPartners).where(eq(tourItineraryPartners.id, tourItineraryPartnerId)).limit(1);
    if (!link) throw createHttpError(404, 'Itinerary partner link not found');
    await ItineraryRequestService.assertTourAuthorOrAdmin(link.tourId, requester);

    const [newPartner] = await db.select({ id: businessPartners.id, type: businessPartners.type, approvalStatus: businessPartners.approvalStatus }).from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!newPartner || newPartner.approvalStatus !== 'approved') {
      throw createHttpError(400, 'The replacement business is unknown or not yet approved');
    }

    const liveRequests = await db
      .select()
      .from(itineraryPartnerRequests)
      .where(and(
        eq(itineraryPartnerRequests.tourItineraryPartnerId, tourItineraryPartnerId),
        inArray(itineraryPartnerRequests.status, ['pending', 'held', 'countered']),
      ));

    for (const oldRequest of liveRequests) {
      const [oldPartner] = await db.select({ ownerId: businessPartners.ownerId }).from(businessPartners).where(eq(businessPartners.id, oldRequest.businessPartnerId)).limit(1);
      await updateRequestWithVersion(oldRequest.id, oldRequest.version, {
        status: 'declined',
        capacityConfirmed: null,
        holdExpiresAt: null,
        counterUnits: null, counterDate: null, counterTime: null, counterNotes: null,
        responseNotes: 'Replaced by agency',
      });
      await logEvent(oldRequest.id, oldRequest.status, 'declined', requester.id, 'agency', 0, 'Replaced by agency');
      if (oldPartner) {
        try {
          const [tour] = await db.select({ title: tours.title }).from(tours).where(eq(tours.id, link.tourId)).limit(1);
          await notifications.createItineraryRequestReplacedNotification(oldPartner.ownerId, tour?.title ?? 'a tour', oldRequest.serviceDate, oldRequest.id);
        } catch (err) {
          console.error('Failed to notify replaced partner:', err);
        }
      }
    }

    await db.update(tourItineraryPartners).set({ businessPartnerId, name, updatedAt: new Date() }).where(eq(tourItineraryPartners.id, tourItineraryPartnerId));

    // Carry the swap forward with a fresh request on the same date, if the old link had one.
    const carryDate = liveRequests[0]?.serviceDate;
    if (carryDate) {
      await ItineraryRequestService.createManualRequest(tourItineraryPartnerId, requester, carryDate, liveRequests[0]?.serviceTime ?? undefined);
    }

    return { tourItineraryPartnerId, businessPartnerId, name };
  }

  /**
   * Sweep: `held` rows past holdExpiresAt, and `pending`/`countered` rows
   * past respondByAt, get flipped to `expired`, freeing whatever capacity
   * they had reserved. Run on a timer (itineraryRequestExpiry.ts) — this is
   * what makes getAvailableCapacity's pooled reservation safe over time
   * rather than permanently locking up a partner's calendar.
   */
  static async expireStaleRequests(): Promise<number> {
    const now = new Date();
    const stale = await db
      .select()
      .from(itineraryPartnerRequests)
      .where(or(
        and(eq(itineraryPartnerRequests.status, 'held'), lt(itineraryPartnerRequests.holdExpiresAt, now)),
        and(inArray(itineraryPartnerRequests.status, ['pending', 'countered']), lt(itineraryPartnerRequests.respondByAt, now)),
      ));

    for (const request of stale) {
      const updated = await updateRequestWithVersion(request.id, request.version, {
        status: 'expired',
        capacityConfirmed: null,
        holdExpiresAt: null,
        respondByAt: null,
        counterUnits: null, counterDate: null, counterTime: null, counterNotes: null,
      }).catch(() => null);
      if (!updated) continue; // lost a race with a real response — leave it as whatever it now is

      await logEvent(request.id, request.status, 'expired', null, 'system', 0, 'Auto-expired: no response in time');

      try {
        const [tour] = await db.select({ title: tours.title }).from(tours).where(eq(tours.id, request.tourId)).limit(1);
        const authors = await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(eq(tourAuthors.tourId, request.tourId));
        for (const { userId } of authors) {
          await notifications.createItineraryRequestExpiredNotification(userId, tour?.title ?? 'a tour', request.serviceDate, request.id);
        }
      } catch (err) {
        console.error('Failed to notify agency of expired itinerary request:', err);
      }
    }

    return stale.length;
  }

  /**
   * Total capacity for (partner, date) minus what's already reserved
   * (pending/held/confirmed/countered) by OTHER requests for that same
   * date. When `unitTypeId` is given, checks that specific
   * businessPartnerUnitTypes row's own totalUnits/blocks instead of the
   * partner's pooled businessPartnerCapacity/Overrides, and scopes the
   * reservation sum to requests against that same type — so two different
   * room/vehicle types on the same date never share a pool.
   */
  static async getAvailableCapacity(businessPartnerId: string, serviceDate: string, excludingRequestId?: string, unitTypeId?: string | null): Promise<number> {
    let total: number;
    if (unitTypeId) {
      const [unitType] = await db.select({ totalUnits: businessPartnerUnitTypes.totalUnits }).from(businessPartnerUnitTypes)
        .where(eq(businessPartnerUnitTypes.id, unitTypeId)).limit(1);
      const [{ blocked }] = await db
        .select({ blocked: sql<number>`COALESCE(SUM(${businessPartnerUnitTypeBlocks.blockedCount}), 0)` })
        .from(businessPartnerUnitTypeBlocks)
        .where(and(eq(businessPartnerUnitTypeBlocks.unitTypeId, unitTypeId), eq(businessPartnerUnitTypeBlocks.date, serviceDate)));
      total = Math.max(0, (unitType?.totalUnits ?? 0) - Number(blocked));
    } else {
      const [override] = await db.select({ capacity: businessPartnerCapacityOverrides.capacity }).from(businessPartnerCapacityOverrides)
        .where(and(eq(businessPartnerCapacityOverrides.businessPartnerId, businessPartnerId), eq(businessPartnerCapacityOverrides.date, serviceDate)))
        .limit(1);
      const [policy] = await db.select({ defaultDailyCapacity: businessPartnerCapacity.defaultDailyCapacity }).from(businessPartnerCapacity)
        .where(eq(businessPartnerCapacity.businessPartnerId, businessPartnerId)).limit(1);
      total = override?.capacity ?? policy?.defaultDailyCapacity ?? 0;
    }

    const conditions = [
      eq(itineraryPartnerRequests.serviceDate, serviceDate),
      inArray(itineraryPartnerRequests.status, ['pending', 'held', 'confirmed', 'countered']),
      unitTypeId ? eq(itineraryPartnerRequests.unitTypeId, unitTypeId) : eq(itineraryPartnerRequests.businessPartnerId, businessPartnerId),
    ];
    if (excludingRequestId) conditions.push(ne(itineraryPartnerRequests.id, excludingRequestId));

    // Pending/countered reserve their ask (unitsRequested); held/confirmed
    // reserve what the partner actually committed (capacityConfirmed) — a
    // hold or confirm can be for less than was originally asked.
    const [{ reserved }] = await db
      .select({
        reserved: sql<number>`COALESCE(SUM(CASE
          WHEN ${itineraryPartnerRequests.status} IN ('pending', 'countered') THEN ${itineraryPartnerRequests.unitsRequested}
          WHEN ${itineraryPartnerRequests.status} IN ('held', 'confirmed') THEN COALESCE(${itineraryPartnerRequests.capacityConfirmed}, 0)
          ELSE 0
        END), 0)`,
      })
      .from(itineraryPartnerRequests)
      .where(and(...conditions));

    return Math.max(0, total - Number(reserved));
  }

  /**
   * Total/blocked/reserved/available per date over a range, for the
   * partner's own inventory management table — one grouped-by-date query
   * per source instead of N+1 per-date getAvailableCapacity calls.
   */
  static async getUnitTypeInventory(unitTypeId: string, from: string, to: string) {
    const [unitType] = await db.select().from(businessPartnerUnitTypes).where(eq(businessPartnerUnitTypes.id, unitTypeId)).limit(1);
    if (!unitType) throw createHttpError(404, 'Unit type not found');

    const blockRows = await db
      .select({ date: businessPartnerUnitTypeBlocks.date, channel: businessPartnerUnitTypeBlocks.channel, blockedCount: businessPartnerUnitTypeBlocks.blockedCount })
      .from(businessPartnerUnitTypeBlocks)
      .where(and(eq(businessPartnerUnitTypeBlocks.unitTypeId, unitTypeId), sql`${businessPartnerUnitTypeBlocks.date} BETWEEN ${from} AND ${to}`));

    const reservedRows = await db
      .select({
        date: itineraryPartnerRequests.serviceDate,
        status: itineraryPartnerRequests.status,
        unitsRequested: itineraryPartnerRequests.unitsRequested,
        capacityConfirmed: itineraryPartnerRequests.capacityConfirmed,
      })
      .from(itineraryPartnerRequests)
      .where(and(
        eq(itineraryPartnerRequests.unitTypeId, unitTypeId),
        inArray(itineraryPartnerRequests.status, ['pending', 'held', 'confirmed', 'countered']),
        sql`${itineraryPartnerRequests.serviceDate} BETWEEN ${from} AND ${to}`,
      ));

    const blockedByDate = new Map<string, { total: number; byChannel: Record<string, number> }>();
    for (const b of blockRows) {
      const entry = blockedByDate.get(b.date) ?? { total: 0, byChannel: {} };
      entry.total += b.blockedCount;
      entry.byChannel[b.channel] = (entry.byChannel[b.channel] ?? 0) + b.blockedCount;
      blockedByDate.set(b.date, entry);
    }
    const reservedByDate = new Map<string, number>();
    for (const r of reservedRows) {
      const units = r.status === 'pending' || r.status === 'countered' ? r.unitsRequested : (r.capacityConfirmed ?? 0);
      reservedByDate.set(r.date, (reservedByDate.get(r.date) ?? 0) + units);
    }

    const dates: string[] = [];
    for (let d = new Date(from); toDateString(d) <= to; d = addDays(d, 1)) dates.push(toDateString(d));

    return dates.map((date) => {
      const blocked = blockedByDate.get(date)?.total ?? 0;
      const reserved = reservedByDate.get(date) ?? 0;
      const occupied = blocked + reserved;
      return {
        date,
        total: unitType.totalUnits,
        blocked,
        blockedByChannel: blockedByDate.get(date)?.byChannel ?? {},
        reservedByTourBnt: reserved,
        occupied,
        available: Math.max(0, unitType.totalUnits - occupied),
      };
    });
  }

  /** Admin/owner-checked in the controller — refuses if a live (non-terminal) request or itinerary link still references this type. */
  static async deleteUnitType(unitTypeId: string): Promise<{ blocked: boolean; liveRequestCount: number; linkCount: number }> {
    const [{ value: liveRequestCount }] = await db
      .select({ value: sql<number>`count(*)` })
      .from(itineraryPartnerRequests)
      .where(and(eq(itineraryPartnerRequests.unitTypeId, unitTypeId), inArray(itineraryPartnerRequests.status, ['pending', 'held', 'countered'])));
    const [{ value: linkCount }] = await db
      .select({ value: sql<number>`count(*)` })
      .from(tourItineraryPartners)
      .where(eq(tourItineraryPartners.unitTypeId, unitTypeId));

    if (Number(liveRequestCount) > 0 || Number(linkCount) > 0) {
      return { blocked: true, liveRequestCount: Number(liveRequestCount), linkCount: Number(linkCount) };
    }

    await db.delete(businessPartnerUnitTypes).where(eq(businessPartnerUnitTypes.id, unitTypeId));
    return { blocked: false, liveRequestCount: 0, linkCount: 0 };
  }

  /**
   * True iff [startTime, endTime) on `date` overlaps no manual
   * businessPartnerAvailabilityBlocks row and no other live
   * (pending/held/confirmed/countered) request for this partner — the
   * guide-appropriate replacement for getAvailableCapacity's pooled-count
   * math, since a single person's calendar is a conflict check, not a
   * subtraction. A block/request with a missing time is treated as
   * occupying the whole day (conservative).
   */
  static async isTimeSlotAvailable(businessPartnerId: string, date: string, startTime: string, endTime: string, excludingRequestId?: string): Promise<boolean> {
    const overlaps = (existingStart: string | null, existingEnd: string | null): boolean => {
      if (!existingStart || !existingEnd) return true; // no time recorded — assume it occupies the whole day
      return !(existingEnd <= startTime || existingStart >= endTime);
    };

    const blocks = await db.select({ startTime: businessPartnerAvailabilityBlocks.startTime, endTime: businessPartnerAvailabilityBlocks.endTime })
      .from(businessPartnerAvailabilityBlocks)
      .where(and(eq(businessPartnerAvailabilityBlocks.businessPartnerId, businessPartnerId), eq(businessPartnerAvailabilityBlocks.date, date)));
    if (blocks.some((b) => overlaps(b.startTime, b.endTime))) return false;

    const conditions = [
      eq(itineraryPartnerRequests.businessPartnerId, businessPartnerId),
      eq(itineraryPartnerRequests.serviceDate, date),
      inArray(itineraryPartnerRequests.status, ['pending', 'held', 'confirmed', 'countered']),
    ];
    if (excludingRequestId) conditions.push(ne(itineraryPartnerRequests.id, excludingRequestId));

    const requests = await db.select({ serviceTime: itineraryPartnerRequests.serviceTime, serviceEndTime: itineraryPartnerRequests.serviceEndTime })
      .from(itineraryPartnerRequests)
      .where(and(...conditions));
    if (requests.some((r) => overlaps(r.serviceTime, r.serviceEndTime))) return false;

    return true;
  }

  /** Owner-or-admin gated in the controller. */
  static async getAvailabilityBlocks(businessPartnerId: string, date?: string) {
    const conditions = [eq(businessPartnerAvailabilityBlocks.businessPartnerId, businessPartnerId)];
    if (date) conditions.push(eq(businessPartnerAvailabilityBlocks.date, date));
    return db.select().from(businessPartnerAvailabilityBlocks).where(and(...conditions)).orderBy(businessPartnerAvailabilityBlocks.date);
  }

  /** Owner-or-admin gated in the controller. */
  static async setAvailabilityBlock(businessPartnerId: string, date: string, startTime: string, endTime: string, reason?: string) {
    const [created] = await db.insert(businessPartnerAvailabilityBlocks).values({ businessPartnerId, date, startTime, endTime, reason: reason || null }).returning();
    return created;
  }

  /** Owner-or-admin gated in the controller. */
  static async deleteAvailabilityBlock(blockId: string): Promise<void> {
    await db.delete(businessPartnerAvailabilityBlocks).where(eq(businessPartnerAvailabilityBlocks.id, blockId));
  }
}

/**
 * Applies `patch` only if the row is still at `expectedVersion`, incrementing
 * it — the optimistic-concurrency guard that stops two racing transitions
 * (e.g. a partner confirming while the expiry sweep is expiring the same
 * request) from silently clobbering each other. Throws 409 if the row moved.
 */
async function updateRequestWithVersion(
  requestId: string,
  expectedVersion: number,
  patch: Partial<typeof itineraryPartnerRequests.$inferInsert>,
): Promise<RequestRow> {
  const [updated] = await db.update(itineraryPartnerRequests)
    .set({ ...patch, version: expectedVersion + 1, updatedAt: new Date() })
    .where(and(eq(itineraryPartnerRequests.id, requestId), eq(itineraryPartnerRequests.version, expectedVersion)))
    .returning();
  if (!updated) throw createHttpError(409, 'This request was just updated by someone else — refresh and try again.');
  return updated;
}

async function logEvent(
  requestId: string,
  fromStatus: RequestStatus | null,
  toStatus: RequestStatus,
  actorId: string | null,
  actorRole: 'agency' | 'partner' | 'system',
  unitsAtEvent: number | null,
  notes?: string | null,
): Promise<void> {
  await db.insert(itineraryRequestEvents).values({ requestId, fromStatus, toStatus, actorId, actorRole, unitsAtEvent, notes: notes ?? null });
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

async function notifyAgencyOfPartnerResponse(request: RequestRow, partnerName: string, status: RequestStatus): Promise<void> {
  const authors = await db.select({ userId: tourAuthors.userId }).from(tourAuthors).where(eq(tourAuthors.tourId, request.tourId));
  if (authors.length === 0) return;

  let tourTitle: string | undefined;
  if (status === 'held' || status === 'countered') {
    const [tour] = await db.select({ title: tours.title }).from(tours).where(eq(tours.id, request.tourId)).limit(1);
    tourTitle = tour?.title;
  }

  for (const { userId } of authors) {
    if (status === 'confirmed') {
      await notifications.createItineraryRequestConfirmedNotification(userId, partnerName, request.serviceDate, request.id);
    } else if (status === 'declined') {
      await notifications.createItineraryRequestDeclinedNotification(userId, partnerName, request.serviceDate, request.id);
    } else if (status === 'held') {
      await notifications.createItineraryRequestHeldNotification(userId, tourTitle ?? 'a tour', request.serviceDate, request.id);
    } else if (status === 'countered') {
      await notifications.createItineraryRequestCounteredNotification(userId, tourTitle ?? 'a tour', request.serviceDate, request.id);
    }
  }
}
