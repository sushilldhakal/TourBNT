import {
  db,
  tours,
  tourItineraryPartners,
  itineraryPartnerRequests,
  itineraryRequestEvents,
  itinerarySlotApplications,
  partnerDealWithdrawals,
  businessPartners,
  businessPartnerCapacity,
  businessPartnerCapacityOverrides,
  businessPartnerAvailabilityBlocks,
} from '../../../db';
import { and, eq, inArray, ne, desc } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { ITINERARY_ROLE_TO_PARTNER_TYPES, type BusinessPartnerType } from '../../businessPartners/businessPartnerTypes';
import { ItineraryRequestService } from './itineraryRequestService';
import { dayIndexOf, dayLabelOf, expandOpenSlotDates, serviceWindowOf, type OpenSlotTourDates } from './openSlotDates';
import {
  assessWithdrawalEvidence,
  INSUFFICIENT_WITHDRAWAL_HOLD,
  WITHDRAWAL_WARNING_INSUFFICIENT,
  WITHDRAWAL_WARNING_SUFFICIENT,
} from './withdrawalEvidence';

type Role = 'transport' | 'accommodation' | 'guide' | 'meals' | 'other';
const LIVE = ['pending', 'held', 'confirmed', 'countered'] as const;

const rolesForType = (type: string): Role[] =>
  Object.entries(ITINERARY_ROLE_TO_PARTNER_TYPES)
    .filter(([, types]) => types.includes(type as BusinessPartnerType))
    .map(([role]) => role as Role);

const todayUtc = (): string => new Date().toISOString().slice(0, 10);

interface SlotCandidate {
  serviceDate: string;
  time?: string;
  endTime?: string;
}

/** True when [start, end) overlaps an existing window. A missing window occupies the whole day. */
function overlaps(existingStart: string | null, existingEnd: string | null, start: string, end: string): boolean {
  if (!existingStart || !existingEnd) return true;
  return !(existingEnd <= start || existingStart >= end);
}

/**
 * Which of these dates the business is actually free for, in one read
 * instead of a capacity query per cell. Guides are free when nothing
 * overlaps the window. Everyone else is free when pooled capacity remains.
 */
async function freedomOf(partnerId: string, partnerType: string, candidates: SlotCandidate[]): Promise<(c: SlotCandidate) => boolean> {
  const dates = Array.from(new Set(candidates.map((c) => c.serviceDate)));
  if (dates.length === 0) return () => false;

  if (partnerType === 'guide') {
    const [blocks, requests] = await Promise.all([
      db.select({ date: businessPartnerAvailabilityBlocks.date, startTime: businessPartnerAvailabilityBlocks.startTime, endTime: businessPartnerAvailabilityBlocks.endTime })
        .from(businessPartnerAvailabilityBlocks)
        .where(and(eq(businessPartnerAvailabilityBlocks.businessPartnerId, partnerId), inArray(businessPartnerAvailabilityBlocks.date, dates))),
      db.select({ serviceDate: itineraryPartnerRequests.serviceDate, serviceTime: itineraryPartnerRequests.serviceTime, serviceEndTime: itineraryPartnerRequests.serviceEndTime })
        .from(itineraryPartnerRequests)
        .where(and(
          eq(itineraryPartnerRequests.businessPartnerId, partnerId),
          inArray(itineraryPartnerRequests.serviceDate, dates),
          inArray(itineraryPartnerRequests.status, [...LIVE]),
        )),
    ]);
    return (c) => {
      if (c.time && c.endTime) {
        if (blocks.some((b) => b.date === c.serviceDate && overlaps(b.startTime, b.endTime, c.time!, c.endTime!))) return false;
        if (requests.some((r) => r.serviceDate === c.serviceDate && overlaps(r.serviceTime, r.serviceEndTime, c.time!, c.endTime!))) return false;
        return true;
      }
      if (blocks.some((b) => b.date === c.serviceDate)) return false;
      if (requests.some((r) => r.serviceDate === c.serviceDate)) return false;
      return true;
    };
  }

  const [policy, overrides, reservedRows] = await Promise.all([
    db.select({ defaultDailyCapacity: businessPartnerCapacity.defaultDailyCapacity }).from(businessPartnerCapacity).where(eq(businessPartnerCapacity.businessPartnerId, partnerId)).limit(1),
    db.select({ date: businessPartnerCapacityOverrides.date, capacity: businessPartnerCapacityOverrides.capacity })
      .from(businessPartnerCapacityOverrides)
      .where(and(eq(businessPartnerCapacityOverrides.businessPartnerId, partnerId), inArray(businessPartnerCapacityOverrides.date, dates))),
    db.select({
      serviceDate: itineraryPartnerRequests.serviceDate,
      status: itineraryPartnerRequests.status,
      unitsRequested: itineraryPartnerRequests.unitsRequested,
      capacityConfirmed: itineraryPartnerRequests.capacityConfirmed,
    }).from(itineraryPartnerRequests).where(and(
      eq(itineraryPartnerRequests.businessPartnerId, partnerId),
      inArray(itineraryPartnerRequests.serviceDate, dates),
      inArray(itineraryPartnerRequests.status, [...LIVE]),
    )),
  ]);

  const overrideByDate = new Map(overrides.map((o) => [o.date, o.capacity]));
  const reservedByDate = new Map<string, number>();
  for (const row of reservedRows) {
    const units = row.status === 'pending' || row.status === 'countered' ? row.unitsRequested : (row.capacityConfirmed ?? 0);
    reservedByDate.set(row.serviceDate, (reservedByDate.get(row.serviceDate) ?? 0) + units);
  }
  const fallback = policy[0]?.defaultDailyCapacity ?? 0;
  return (c) => (overrideByDate.get(c.serviceDate) ?? fallback) - (reservedByDate.get(c.serviceDate) ?? 0) > 0;
}

async function assertPartnerOwner(businessPartnerId: string, requester: { id: string; isAdmin: boolean }) {
  const [partner] = await db.select().from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
  if (!partner) throw createHttpError(404, 'Business not found');
  if (!requester.isAdmin && partner.ownerId !== requester.id) throw createHttpError(403, 'Not authorized for this business');
  return partner;
}

export class OpenSlotService {
  /** Open departure dates this approved business is free to apply for. */
  static async listForPartner(businessPartnerId: string) {
    const [partner] = await db.select().from(businessPartners).where(eq(businessPartners.id, businessPartnerId)).limit(1);
    if (!partner) throw createHttpError(404, 'Business not found');
    if (partner.approvalStatus !== 'approved' || !partner.isApproved || !partner.isActive || partner.approvalHoldReason) return [];
    const roles = rolesForType(partner.type);
    if (roles.length === 0) return [];

    const links = await db
      .select({
        link: tourItineraryPartners,
        title: tours.title,
        itinerary: tours.itinerary,
        tourDates: tours.tourDates,
        maxSize: tours.maxSize,
      })
      .from(tourItineraryPartners)
      .innerJoin(tours, eq(tourItineraryPartners.tourId, tours.id))
      .where(and(
        eq(tourItineraryPartners.openForAll, true),
        eq(tours.tourStatus, 'Published'),
        inArray(tourItineraryPartners.role, roles),
      ));
    if (links.length === 0) return [];

    const today = todayUtc();
    type Row = {
      linkId: string;
      tourId: string;
      tourTitle: string;
      role: Role;
      dayLabel: string;
      serviceDate: string;
      unitsRequested: number | null;
      unitType: string | null;
      serviceTime: string | null;
      serviceEndTime: string | null;
    };
    const candidates: Array<Row & SlotCandidate> = [];
    for (const row of links) {
      const dayIndex = dayIndexOf(row.itinerary, row.link.dayId);
      const dates = expandOpenSlotDates(row.tourDates as OpenSlotTourDates | null, dayIndex, today, row.maxSize);
      const window = serviceWindowOf(row.itinerary, row.link.dayId, row.link.role);
      for (const date of dates) {
        candidates.push({
          linkId: row.link.id,
          tourId: row.link.tourId,
          tourTitle: row.title,
          role: row.link.role,
          dayLabel: dayLabelOf(row.itinerary, row.link.dayId),
          serviceDate: date.serviceDate,
          unitsRequested: row.link.unitsRequested,
          unitType: row.link.unitType,
          serviceTime: window.time ?? null,
          serviceEndTime: window.endTime ?? null,
          time: window.time,
          endTime: window.endTime,
        });
      }
    }
    if (candidates.length === 0) return [];

    const linkIds = Array.from(new Set(candidates.map((c) => c.linkId)));
    const [mine, live] = await Promise.all([
      db.select({
        tourItineraryPartnerId: itinerarySlotApplications.tourItineraryPartnerId,
        serviceDate: itinerarySlotApplications.serviceDate,
        status: itinerarySlotApplications.status,
      }).from(itinerarySlotApplications).where(and(
        eq(itinerarySlotApplications.businessPartnerId, businessPartnerId),
        inArray(itinerarySlotApplications.tourItineraryPartnerId, linkIds),
      )),
      db.select({
        tourItineraryPartnerId: itineraryPartnerRequests.tourItineraryPartnerId,
        serviceDate: itineraryPartnerRequests.serviceDate,
      }).from(itineraryPartnerRequests).where(and(
        inArray(itineraryPartnerRequests.tourItineraryPartnerId, linkIds),
        inArray(itineraryPartnerRequests.status, [...LIVE]),
      )),
    ]);
    const taken = new Set<string>();
    for (const row of mine) {
      if (row.status === 'applied' || row.status === 'selected') taken.add(`${row.tourItineraryPartnerId}|${row.serviceDate}`);
    }
    for (const row of live) taken.add(`${row.tourItineraryPartnerId}|${row.serviceDate}`);

    const open = candidates.filter((c) => !taken.has(`${c.linkId}|${c.serviceDate}`)).slice(0, 80);
    const isFree = await freedomOf(businessPartnerId, partner.type, open);
    return open.filter(isFree).slice(0, 40).map(({ time: _t, endTime: _e, ...slot }) => slot);
  }

  static async apply(businessPartnerId: string, linkId: string, requester: { id: string; isAdmin: boolean }, input: { serviceDate: string; message?: string; unitsOffered?: number }) {
    const partner = await assertPartnerOwner(businessPartnerId, requester);
    if (partner.approvalStatus !== 'approved' || !partner.isApproved || !partner.isActive || partner.approvalHoldReason) {
      throw createHttpError(403, 'This business is not approved to apply for open dates');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate)) throw createHttpError(400, 'serviceDate must be YYYY-MM-DD');
    if (input.unitsOffered !== undefined && (!Number.isFinite(input.unitsOffered) || input.unitsOffered < 0)) {
      throw createHttpError(400, 'unitsOffered must be a non-negative number');
    }

    const [row] = await db
      .select({ link: tourItineraryPartners, itinerary: tours.itinerary, tourDates: tours.tourDates, maxSize: tours.maxSize, tourStatus: tours.tourStatus })
      .from(tourItineraryPartners)
      .innerJoin(tours, eq(tourItineraryPartners.tourId, tours.id))
      .where(eq(tourItineraryPartners.id, linkId))
      .limit(1);
    if (!row || !row.link.openForAll) throw createHttpError(404, 'Open slot not found');
    if (row.tourStatus !== 'Published') throw createHttpError(400, 'This tour is not open for applications');
    if (!rolesForType(partner.type).includes(row.link.role)) {
      throw createHttpError(400, 'This business type cannot apply for that role');
    }

    const dayIndex = dayIndexOf(row.itinerary, row.link.dayId);
    const dates = expandOpenSlotDates(row.tourDates as OpenSlotTourDates | null, dayIndex, todayUtc(), row.maxSize, 80);
    const match = dates.find((d) => d.serviceDate === input.serviceDate);
    if (!match) throw createHttpError(400, 'That date is not an open departure for this day');

    const [live] = await db.select({ id: itineraryPartnerRequests.id }).from(itineraryPartnerRequests).where(and(
      eq(itineraryPartnerRequests.tourItineraryPartnerId, linkId),
      eq(itineraryPartnerRequests.serviceDate, input.serviceDate),
      inArray(itineraryPartnerRequests.status, [...LIVE]),
    )).limit(1);
    if (live) throw createHttpError(400, 'This date already has a supplier');

    const window = serviceWindowOf(row.itinerary, row.link.dayId, row.link.role);
    const isFree = await freedomOf(partner.id, partner.type, [{ serviceDate: input.serviceDate, time: window.time, endTime: window.endTime }]);
    if (!isFree({ serviceDate: input.serviceDate, time: window.time, endTime: window.endTime })) {
      throw createHttpError(400, 'You are not free on that date');
    }

    const [existing] = await db.select().from(itinerarySlotApplications).where(and(
      eq(itinerarySlotApplications.tourItineraryPartnerId, linkId),
      eq(itinerarySlotApplications.businessPartnerId, partner.id),
      eq(itinerarySlotApplications.serviceDate, input.serviceDate),
    )).limit(1);

    if (existing && (existing.status === 'applied' || existing.status === 'selected')) {
      throw createHttpError(400, 'You have already applied for this date');
    }

    const values = {
      message: input.message?.trim() || null,
      unitsOffered: input.unitsOffered ?? null,
      status: 'applied' as const,
      sourceDepartureDate: match.sourceDeparture,
      updatedAt: new Date(),
    };
    if (existing) {
      const [updated] = await db.update(itinerarySlotApplications).set(values).where(eq(itinerarySlotApplications.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(itinerarySlotApplications).values({
      tourItineraryPartnerId: linkId,
      businessPartnerId: partner.id,
      serviceDate: input.serviceDate,
      ...values,
    }).returning();
    return created;
  }

  /** Every open day on this tour, with who has applied for each departure date. */
  static async listForTour(tourId: string, requester: { id: string; isAdmin: boolean }) {
    await ItineraryRequestService.assertTourAuthorOrAdmin(tourId, requester);
    const [tour] = await db.select({ itinerary: tours.itinerary, tourDates: tours.tourDates, maxSize: tours.maxSize }).from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) throw createHttpError(404, 'Tour not found');

    const links = await db.select().from(tourItineraryPartners).where(and(eq(tourItineraryPartners.tourId, tourId), eq(tourItineraryPartners.openForAll, true)));
    if (links.length === 0) return [];

    const linkIds = links.map((l) => l.id);
    const [applications, live] = await Promise.all([
      db.select({
        application: itinerarySlotApplications,
        businessName: businessPartners.name,
        businessType: businessPartners.type,
      }).from(itinerarySlotApplications)
        .innerJoin(businessPartners, eq(itinerarySlotApplications.businessPartnerId, businessPartners.id))
        .where(inArray(itinerarySlotApplications.tourItineraryPartnerId, linkIds)),
      db.select({
        tourItineraryPartnerId: itineraryPartnerRequests.tourItineraryPartnerId,
        serviceDate: itineraryPartnerRequests.serviceDate,
        status: itineraryPartnerRequests.status,
        partnerName: businessPartners.name,
      }).from(itineraryPartnerRequests)
        .innerJoin(businessPartners, eq(itineraryPartnerRequests.businessPartnerId, businessPartners.id))
        .where(and(
          inArray(itineraryPartnerRequests.tourItineraryPartnerId, linkIds),
          inArray(itineraryPartnerRequests.status, [...LIVE]),
        )),
    ]);

    const today = todayUtc();
    return links.flatMap((link) => {
      const dayIndex = dayIndexOf(tour.itinerary, link.dayId);
      const dates = expandOpenSlotDates(tour.tourDates as OpenSlotTourDates | null, dayIndex, today, tour.maxSize, 80);
      const rows = dates.length > 0 ? dates : [null];
      return rows.map((date) => {
        const serviceDate = date?.serviceDate ?? null;
        const apps = applications.filter((a) => a.application.tourItineraryPartnerId === link.id && (serviceDate === null || a.application.serviceDate === serviceDate));
        const filled = live.find((r) => r.tourItineraryPartnerId === link.id && r.serviceDate === serviceDate);
        return {
          linkId: link.id,
          role: link.role,
          dayId: link.dayId,
          dayLabel: dayLabelOf(tour.itinerary, link.dayId),
          unitsRequested: link.unitsRequested,
          unitType: link.unitType,
          serviceDate,
          filled: !!filled,
          selectedPartnerName: filled?.partnerName ?? null,
          applications: apps
            .filter((a) => a.application.status === 'applied' || a.application.status === 'selected')
            .map((a) => ({
              id: a.application.id,
              businessPartnerId: a.application.businessPartnerId,
              businessName: a.businessName,
              businessType: a.businessType,
              message: a.application.message,
              unitsOffered: a.application.unitsOffered,
              status: a.application.status,
              serviceDate: a.application.serviceDate,
            })),
        };
      });
    });
  }

  /** Seller picks one applicant for that date. The slot stays open for other dates. */
  static async selectApplication(applicationId: string, requester: { id: string; isAdmin: boolean }, tourId: string) {
    const [found] = await db
      .select({ application: itinerarySlotApplications, link: tourItineraryPartners, itinerary: tours.itinerary, maxSize: tours.maxSize })
      .from(itinerarySlotApplications)
      .innerJoin(tourItineraryPartners, eq(itinerarySlotApplications.tourItineraryPartnerId, tourItineraryPartners.id))
      .innerJoin(tours, eq(tourItineraryPartners.tourId, tours.id))
      .where(eq(itinerarySlotApplications.id, applicationId))
      .limit(1);
    if (!found || found.link.tourId !== tourId) throw createHttpError(404, 'Application not found');
    await ItineraryRequestService.assertTourAuthorOrAdmin(found.link.tourId, requester);
    if (!found.link.openForAll) throw createHttpError(400, 'This day is no longer open');
    if (found.application.status !== 'applied') throw createHttpError(400, 'This application is no longer waiting');

    const [partner] = await db.select().from(businessPartners).where(eq(businessPartners.id, found.application.businessPartnerId)).limit(1);
    if (!partner || partner.approvalStatus !== 'approved' || !partner.isApproved || partner.approvalHoldReason) {
      throw createHttpError(400, 'That business is not currently approved');
    }

    const window = serviceWindowOf(found.itinerary, found.link.dayId, found.link.role);
    const serviceTime = window.time ?? null;
    const existing = await db.select().from(itineraryPartnerRequests).where(and(
      eq(itineraryPartnerRequests.tourItineraryPartnerId, found.link.id),
      eq(itineraryPartnerRequests.serviceDate, found.application.serviceDate),
    ));
    const sameSlot = existing.find((r) => (r.serviceTime ?? null) === serviceTime);
    if (sameSlot && (LIVE as readonly string[]).includes(sameSlot.status)) {
      throw createHttpError(400, 'This date already has a supplier');
    }

    const units = Math.max(1, found.application.unitsOffered ?? found.link.unitsRequested ?? found.maxSize ?? 1);
    if (partner.type === 'guide') {
      const isFree = await freedomOf(partner.id, partner.type, [{ serviceDate: found.application.serviceDate, time: window.time, endTime: window.endTime }]);
      if (!isFree({ serviceDate: found.application.serviceDate, time: window.time, endTime: window.endTime })) {
        throw createHttpError(400, 'That business is no longer free on this date');
      }
    } else {
      const available = await ItineraryRequestService.getAvailableCapacity(partner.id, found.application.serviceDate);
      if (units > available) throw createHttpError(400, `Only ${available} available on ${found.application.serviceDate}`);
    }

    const requestPatch = {
      businessPartnerId: partner.id,
      role: found.link.role,
      serviceDate: found.application.serviceDate,
      serviceTime,
      serviceEndTime: window.endTime ?? null,
      headcount: found.maxSize ?? units,
      unitsRequested: found.link.unitsRequested ?? units,
      status: 'confirmed' as const,
      capacityConfirmed: units,
      responseNotes: found.application.message,
      respondedAt: new Date(),
      respondedBy: requester.id,
      sourceDepartureDate: found.application.sourceDepartureDate,
      holdExpiresAt: null,
      counterUnits: null,
      counterDate: null,
      counterTime: null,
      counterNotes: null,
      updatedAt: new Date(),
    };

    let requestId: string;
    if (sameSlot) {
      const [updated] = await db.update(itineraryPartnerRequests)
        .set({ ...requestPatch, version: sameSlot.version + 1 })
        .where(eq(itineraryPartnerRequests.id, sameSlot.id))
        .returning();
      requestId = updated.id;
      await db.insert(itineraryRequestEvents).values({
        requestId, fromStatus: sameSlot.status, toStatus: 'confirmed', actorId: requester.id, actorRole: 'agency', unitsAtEvent: units, notes: 'Seller chose this applicant for an open date',
      });
    } else {
      const [created] = await db.insert(itineraryPartnerRequests).values({
        tourId: found.link.tourId,
        tourItineraryPartnerId: found.link.id,
        ...requestPatch,
      }).returning();
      requestId = created.id;
      await db.insert(itineraryRequestEvents).values({
        requestId, fromStatus: null, toStatus: 'confirmed', actorId: requester.id, actorRole: 'agency', unitsAtEvent: units, notes: 'Seller chose this applicant for an open date',
      });
    }

    await db.update(itinerarySlotApplications).set({ status: 'selected', updatedAt: new Date() }).where(eq(itinerarySlotApplications.id, found.application.id));
    await db.update(itinerarySlotApplications).set({ status: 'declined', updatedAt: new Date() }).where(and(
      eq(itinerarySlotApplications.tourItineraryPartnerId, found.link.id),
      eq(itinerarySlotApplications.serviceDate, found.application.serviceDate),
      eq(itinerarySlotApplications.status, 'applied'),
      ne(itinerarySlotApplications.id, found.application.id),
    ));

    return { requestId, businessPartnerId: partner.id, businessName: partner.name, serviceDate: found.application.serviceDate };
  }

  /**
   * Partner backs out of a request they had already confirmed. The deal is
   * flagged either way. A thin explanation puts the account on pending
   * approval until they write enough to explain the cancellation.
   */
  static async withdrawConfirmed(businessPartnerId: string, requestId: string, requester: { id: string; isAdmin: boolean }, explanation: string) {
    const [request] = await db.select().from(itineraryPartnerRequests).where(eq(itineraryPartnerRequests.id, requestId)).limit(1);
    if (!request || request.businessPartnerId !== businessPartnerId) throw createHttpError(404, 'Request not found');
    const partner = await assertPartnerOwner(request.businessPartnerId, requester);
    if (request.status !== 'confirmed') throw createHttpError(400, 'Only an already approved deal can be withdrawn this way');

    const assessment = assessWithdrawalEvidence(explanation);
    const [updated] = await db.update(itineraryPartnerRequests).set({
      status: 'declined',
      capacityConfirmed: null,
      responseNotes: explanation.trim(),
      respondedAt: new Date(),
      respondedBy: requester.id,
      holdExpiresAt: null,
      version: request.version + 1,
      updatedAt: new Date(),
    }).where(and(eq(itineraryPartnerRequests.id, requestId), eq(itineraryPartnerRequests.version, request.version))).returning();
    if (!updated) throw createHttpError(409, 'This request was just updated by someone else — refresh and try again.');

    await db.insert(itineraryRequestEvents).values({
      requestId,
      fromStatus: 'confirmed',
      toStatus: 'declined',
      actorId: requester.id,
      actorRole: 'partner',
      unitsAtEvent: request.capacityConfirmed,
      notes: explanation.trim(),
    });
    await db.insert(partnerDealWithdrawals).values({
      requestId,
      businessPartnerId: partner.id,
      explanation: explanation.trim(),
      evidenceSufficient: assessment.sufficient,
    });
    await db.update(itinerarySlotApplications).set({ status: 'withdrawn', updatedAt: new Date() }).where(and(
      eq(itinerarySlotApplications.tourItineraryPartnerId, request.tourItineraryPartnerId),
      eq(itinerarySlotApplications.businessPartnerId, partner.id),
      eq(itinerarySlotApplications.serviceDate, request.serviceDate),
      eq(itinerarySlotApplications.status, 'selected'),
    ));

    let accountPending = !!partner.approvalHoldReason;
    if (!assessment.sufficient) {
      await db.update(businessPartners).set({
        approvalStatus: 'pending',
        isApproved: false,
        approvalHoldReason: INSUFFICIENT_WITHDRAWAL_HOLD,
        updatedAt: new Date(),
      }).where(eq(businessPartners.id, partner.id));
      accountPending = true;
    }

    return {
      request: updated,
      evidenceSufficient: assessment.sufficient,
      accountPending,
      warning: assessment.warning,
    };
  }

  /** A fuller explanation lifts the pending hold created by a thin cancellation. */
  static async submitWithdrawalEvidence(businessPartnerId: string, requester: { id: string; isAdmin: boolean }, explanation: string) {
    const partner = await assertPartnerOwner(businessPartnerId, requester);
    if (partner.approvalHoldReason !== INSUFFICIENT_WITHDRAWAL_HOLD) {
      throw createHttpError(400, 'This account is not waiting on a cancellation explanation');
    }
    const assessment = assessWithdrawalEvidence(explanation);
    const [latest] = await db.select().from(partnerDealWithdrawals)
      .where(eq(partnerDealWithdrawals.businessPartnerId, partner.id))
      .orderBy(desc(partnerDealWithdrawals.createdAt))
      .limit(1);
    if (latest) {
      await db.update(partnerDealWithdrawals).set({
        explanation: explanation.trim(),
        evidenceSufficient: assessment.sufficient,
        updatedAt: new Date(),
      }).where(eq(partnerDealWithdrawals.id, latest.id));
    }
    if (!assessment.sufficient) {
      return { restored: false, warning: assessment.warning };
    }
    await db.update(partnerDealWithdrawals).set({ evidenceSufficient: true, updatedAt: new Date() }).where(eq(partnerDealWithdrawals.businessPartnerId, partner.id));
    await db.update(businessPartners).set({
      approvalStatus: 'approved',
      isApproved: true,
      approvalHoldReason: null,
      updatedAt: new Date(),
    }).where(eq(businessPartners.id, partner.id));
    return { restored: true, warning: assessment.warning };
  }

  static async withdrawalStatus(businessPartnerId: string, requester: { id: string; isAdmin: boolean }) {
    const partner = await assertPartnerOwner(businessPartnerId, requester);
    const [latest] = await db.select().from(partnerDealWithdrawals)
      .where(eq(partnerDealWithdrawals.businessPartnerId, partner.id))
      .orderBy(desc(partnerDealWithdrawals.createdAt))
      .limit(1);
    if (!latest && partner.approvalHoldReason !== INSUFFICIENT_WITHDRAWAL_HOLD) {
      return { holdReason: partner.approvalHoldReason, warning: null, evidenceSufficient: null, latestExplanation: null };
    }
    const onHold = partner.approvalHoldReason === INSUFFICIENT_WITHDRAWAL_HOLD;
    return {
      holdReason: partner.approvalHoldReason,
      warning: onHold ? WITHDRAWAL_WARNING_INSUFFICIENT : WITHDRAWAL_WARNING_SUFFICIENT,
      evidenceSufficient: onHold ? false : true,
      latestExplanation: latest?.explanation ?? null,
    };
  }
}
