/**
 * Day dialog on the operations timeline: read one itinerary day with its
 * suppliers, pick suppliers that actually serve a destination, and save the
 * change back to the tour's itinerary.
 *
 * The itinerary is the tour's template, shared by every departure of the
 * tour, so an edit here is an edit to the tour itself. It goes through
 * TourService.updateTour like the tour editor does; the only extra care is for
 * suppliers who already hold requests for the day (see assertSwapAllowed).
 */
import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm';
import {
  businessPartners,
  db,
  globalDestinations,
  itineraryPartnerRequests,
  tourItineraryPartners,
  tours,
} from '../../db';
import { sendSuccess } from '../../utils/apiResponse';
import { ITINERARY_ROLE_TO_PARTNER_TYPES } from '../businessPartners/businessPartnerTypes';
import { destinationIdsFor, partnerServes, servesDestination } from '../businessPartners/partnerDestinations';
import { ItineraryRequestService } from '../tours/services/itineraryRequestService';
import { TourService } from '../tours/services/tourService';
import type { StoredItineraryDay, StoredItineraryPartner } from '../tours/tourTypes';
import * as notifications from '../notifications/notificationController';

/** Roles the day dialog edits. `other` (activities, extras) is left exactly as it is. */
export const MANAGED_ROLES = ['accommodation', 'meals', 'transport', 'guide'] as const;
export type ManagedRole = (typeof MANAGED_ROLES)[number];
const isManagedRole = (value: unknown): value is ManagedRole => (MANAGED_ROLES as readonly string[]).includes(value as string);

const LIVE_STATUSES = ['pending', 'held', 'countered'] as const;
const todayIso = () => new Date().toISOString().slice(0, 10);

interface DayLocation {
  itinerary: StoredItineraryDay[];
  index: number;
  day: StoredItineraryDay;
}

function locateDay(itinerary: unknown, dayKey: string): DayLocation {
  const days = Array.isArray(itinerary) ? (itinerary as StoredItineraryDay[]) : [];
  const byIdIndex = days.findIndex((d) => d && d.id === dayKey);
  const idx = dayKey.startsWith('idx:') ? Number(dayKey.slice(4)) : byIdIndex;
  const day = Number.isInteger(idx) ? days[idx] : undefined;
  if (!day) throw createHttpError(404, 'Itinerary day not found');
  return { itinerary: days, index: idx, day };
}

async function loadTour(tourId: string) {
  const [tour] = await db
    .select({ id: tours.id, title: tours.title, destinationId: tours.destinationId, itinerary: tours.itinerary })
    .from(tours)
    .where(eq(tours.id, tourId))
    .limit(1);
  if (!tour) throw createHttpError(404, 'Tour not found');
  return tour;
}

const requesterOf = (req: Request) => ({ id: req.user!.id, isAdmin: req.user!.roles.includes('admin') });

/** The day's destination: what was saved on it, else a destination named in its text, else the tour's own. */
async function resolveDayDestination(day: StoredItineraryDay, tourDestinationId: string | null) {
  const saved = typeof day.destinationId === 'string' && day.destinationId ? day.destinationId : null;
  const all = await db
    .select({ id: globalDestinations.id, name: globalDestinations.name })
    .from(globalDestinations)
    .where(and(eq(globalDestinations.approvalStatus, 'approved'), eq(globalDestinations.isActive, true)));
  const byId = new Map(all.map((d) => [d.id, d]));
  if (saved && byId.has(saved)) return { id: saved, name: byId.get(saved)!.name, source: 'day' as const };
  const text = typeof day.destination === 'string' ? day.destination.toLowerCase() : '';
  if (text) {
    // Longest name first so "Annapurna Region" wins over a shorter name it contains.
    const hit = [...all].sort((a, b) => b.name.length - a.name.length).find((d) => text.includes(d.name.toLowerCase()));
    if (hit) return { id: hit.id, name: hit.name, source: 'text' as const };
  }
  if (tourDestinationId && byId.has(tourDestinationId)) {
    return { id: tourDestinationId, name: byId.get(tourDestinationId)!.name, source: 'tour' as const };
  }
  return { id: null, name: null, source: null };
}

async function liveSummary(tourId: string, dayId: string | undefined) {
  if (!dayId) return new Map<string, { live: number; confirmed: number }>();
  const links = await db
    .select({ id: tourItineraryPartners.id, businessPartnerId: tourItineraryPartners.businessPartnerId })
    .from(tourItineraryPartners)
    .where(and(eq(tourItineraryPartners.tourId, tourId), eq(tourItineraryPartners.dayId, dayId)));
  const summary = new Map<string, { live: number; confirmed: number }>();
  if (links.length === 0) return summary;
  const rows = await db
    .select({ linkId: itineraryPartnerRequests.tourItineraryPartnerId, status: itineraryPartnerRequests.status })
    .from(itineraryPartnerRequests)
    .where(and(
      inArray(itineraryPartnerRequests.tourItineraryPartnerId, links.map((l) => l.id)),
      gte(itineraryPartnerRequests.serviceDate, todayIso()),
      inArray(itineraryPartnerRequests.status, [...LIVE_STATUSES, 'confirmed']),
    ));
  const partnerOfLink = new Map(links.map((l) => [l.id, l.businessPartnerId]));
  for (const row of rows) {
    const partnerId = partnerOfLink.get(row.linkId);
    if (!partnerId) continue;
    const entry = summary.get(partnerId) ?? { live: 0, confirmed: 0 };
    if (row.status === 'confirmed') entry.confirmed += 1;
    else entry.live += 1;
    summary.set(partnerId, entry);
  }
  return summary;
}

/** GET /operations/supplier-options?destinationId= — approved suppliers per role, filtered to the destination. */
export const getSupplierOptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const destinationId = typeof req.query.destinationId === 'string' && req.query.destinationId ? req.query.destinationId : undefined;
    const options: Record<string, unknown[]> = {};
    for (const role of MANAGED_ROLES) {
      const types = ITINERARY_ROLE_TO_PARTNER_TYPES[role];
      const where = and(
        eq(businessPartners.approvalStatus, 'approved'),
        eq(businessPartners.isActive, true),
        inArray(businessPartners.type, types),
        ...(destinationId ? [servesDestination(destinationId)] : []),
      );
      const rows = await db
        .select({ id: businessPartners.id, name: businessPartners.name, type: businessPartners.type, rating: businessPartners.averageRating, destinationId: businessPartners.destinationId })
        .from(businessPartners)
        .where(where)
        .orderBy(desc(businessPartners.averageRating), asc(businessPartners.name))
        .limit(300);
      const served = await destinationIdsFor(rows);
      options[role] = rows.map((row) => ({ id: row.id, name: row.name, type: row.type, rating: row.rating, destinationIds: served.get(row.id) ?? [] }));
    }
    return sendSuccess(res, { destinationId: destinationId ?? null, options }, 'Suppliers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/** GET /operations/tours/:tourId/days/:dayKey */
export const getDayDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, dayKey } = req.params;
    await ItineraryRequestService.assertTourAuthorOrAdmin(tourId, requesterOf(req));
    const tour = await loadTour(tourId);
    const { index, day } = locateDay(tour.itinerary, dayKey);
    const destination = await resolveDayDestination(day, tour.destinationId);
    const live = await liveSummary(tourId, day.id);
    const partners = (day.partners ?? []).map((p) => ({
      role: p.role,
      name: p.name,
      businessPartnerId: p.businessPartnerId ?? null,
      openForAll: p.openForAll === true,
      unitsRequested: p.unitsRequested ?? null,
      unitType: p.unitType ?? null,
      liveRequests: p.businessPartnerId ? live.get(p.businessPartnerId)?.live ?? 0 : 0,
      confirmedRequests: p.businessPartnerId ? live.get(p.businessPartnerId)?.confirmed ?? 0 : 0,
    }));
    // Requests this departure's date lost (declined/expired). The itinerary supplier is shared by every departure,
    // so these are what let one date be handed to another business without touching the others.
    const date = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(req.query.date) ? req.query.date.slice(0, 10) : null;
    const closedRequests = date && day.id
      ? await db
          .select({
            requestId: itineraryPartnerRequests.id,
            role: itineraryPartnerRequests.role,
            status: itineraryPartnerRequests.status,
            businessPartnerId: itineraryPartnerRequests.businessPartnerId,
            partnerName: businessPartners.name,
          })
          .from(itineraryPartnerRequests)
          .innerJoin(tourItineraryPartners, eq(itineraryPartnerRequests.tourItineraryPartnerId, tourItineraryPartners.id))
          .innerJoin(businessPartners, eq(itineraryPartnerRequests.businessPartnerId, businessPartners.id))
          .where(and(
            eq(tourItineraryPartners.tourId, tourId),
            eq(tourItineraryPartners.dayId, day.id),
            eq(itineraryPartnerRequests.serviceDate, date),
            inArray(itineraryPartnerRequests.status, ['declined', 'expired']),
          ))
      : [];
    return sendSuccess(res, {
      tourId,
      tourTitle: tour.title,
      closedRequests,
      dayId: day.id ?? null,
      dayKey,
      dayNumber: index + 1,
      title: typeof day.title === 'string' ? day.title : '',
      place: typeof day.destination === 'string' ? day.destination : '',
      destinationId: destination.id,
      destinationName: destination.name,
      destinationSource: destination.source,
      partners,
    }, 'Itinerary day retrieved successfully');
  } catch (error) {
    next(error);
  }
};

interface PartnerInput {
  role?: unknown;
  businessPartnerId?: unknown;
  name?: unknown;
  openForAll?: unknown;
}

/**
 * Pairs each supplier being swapped out with one coming in for the same role
 * (in order), so the swap goes through replaceSupplier: pending requests are
 * declined and the old supplier notified, and the new one is asked for the same
 * date. A supplier who already confirmed can't be silently dropped.
 */
async function applySupplierChanges(
  tourId: string,
  tourTitle: string,
  dayId: string,
  requester: { id: string; isAdmin: boolean },
  removed: { role: ManagedRole; businessPartnerId: string; name: string }[],
  added: { role: ManagedRole; businessPartnerId: string; name: string }[],
) {
  if (removed.length === 0) return;
  const links = await db
    .select()
    .from(tourItineraryPartners)
    .where(and(eq(tourItineraryPartners.tourId, tourId), eq(tourItineraryPartners.dayId, dayId)));

  // 1. Refuse before touching anything if a removed supplier has confirmed dates.
  for (const old of removed) {
    const link = links.find((l) => l.role === old.role && l.businessPartnerId === old.businessPartnerId);
    if (!link) continue;
    const confirmed = await db
      .select({ id: itineraryPartnerRequests.id })
      .from(itineraryPartnerRequests)
      .where(and(
        eq(itineraryPartnerRequests.tourItineraryPartnerId, link.id),
        eq(itineraryPartnerRequests.status, 'confirmed'),
        gte(itineraryPartnerRequests.serviceDate, todayIso()),
      ));
    if (confirmed.length > 0) {
      throw createHttpError(409, `${old.name} has already confirmed ${confirmed.length} upcoming date${confirmed.length === 1 ? '' : 's'} for this day. Ask them to withdraw, or cancel that request, before replacing them.`);
    }
  }

  // 2. Swap one-for-one so requests move across; anything left over is a plain removal.
  const pool = [...added];
  for (const old of removed) {
    const link = links.find((l) => l.role === old.role && l.businessPartnerId === old.businessPartnerId);
    if (!link) continue;
    const pairIdx = pool.findIndex((a) => a.role === old.role);
    if (pairIdx >= 0) {
      const [next] = pool.splice(pairIdx, 1);
      try {
        await ItineraryRequestService.replaceSupplier(link.id, requester, next.businessPartnerId, next.name);
      } catch (error) {
        // replaceSupplier moves the link first and only then asks the new supplier for the date. If that last
        // step fails (e.g. they already hold a request for that date from another departure) the swap itself
        // stands, so carry on and save the itinerary to match instead of leaving link and itinerary disagreeing.
        const [moved] = await db.select({ businessPartnerId: tourItineraryPartners.businessPartnerId }).from(tourItineraryPartners).where(eq(tourItineraryPartners.id, link.id)).limit(1);
        if (moved?.businessPartnerId !== next.businessPartnerId) throw error;
        console.warn(`Supplier swapped on link ${link.id} but the new request was not created:`, error instanceof Error ? error.message : error);
      }
      continue;
    }
    // Removal with no replacement: decline what is live and tell them, instead of letting the cascade delete it unseen.
    const live = await db
      .select()
      .from(itineraryPartnerRequests)
      .where(and(eq(itineraryPartnerRequests.tourItineraryPartnerId, link.id), inArray(itineraryPartnerRequests.status, [...LIVE_STATUSES])));
    for (const request of live) {
      const [owner] = await db.select({ ownerId: businessPartners.ownerId }).from(businessPartners).where(eq(businessPartners.id, request.businessPartnerId)).limit(1);
      if (owner) {
        try {
          await notifications.createItineraryRequestReplacedNotification(owner.ownerId, tourTitle, request.serviceDate, request.id);
        } catch (error) {
          console.error('Failed to notify removed supplier:', error);
        }
      }
    }
  }
}

/** PATCH /operations/tours/:tourId/days/:dayKey */
export const updateDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tourId, dayKey } = req.params;
    const requester = requesterOf(req);
    await ItineraryRequestService.assertTourAuthorOrAdmin(tourId, requester);
    const tour = await loadTour(tourId);
    const { itinerary, index, day } = locateDay(tour.itinerary, dayKey);
    const body = req.body as { destinationId?: string | null; place?: string; partners?: PartnerInput[] };
    if (!Array.isArray(body.partners)) throw createHttpError(400, 'partners must be a list');

    // Destination: an explicit choice wins; otherwise whatever the day already resolves to.
    let destinationId: string | null;
    if (body.destinationId === undefined) {
      destinationId = (await resolveDayDestination(day, tour.destinationId)).id;
    } else if (body.destinationId === null || body.destinationId === '') {
      destinationId = null;
    } else {
      const [dest] = await db.select({ id: globalDestinations.id }).from(globalDestinations).where(and(eq(globalDestinations.id, body.destinationId), eq(globalDestinations.approvalStatus, 'approved'))).limit(1);
      if (!dest) throw createHttpError(400, 'Unknown destination');
      destinationId = dest.id;
    }

    const oldPartners: StoredItineraryPartner[] = Array.isArray(day.partners) ? day.partners : [];
    const keptOther = oldPartners.filter((p) => !isManagedRole(p.role));
    const oldManaged = oldPartners.filter((p) => isManagedRole(p.role));

    const nextManaged: StoredItineraryPartner[] = [];
    const added: { role: ManagedRole; businessPartnerId: string; name: string }[] = [];
    const seen = new Set<string>();

    for (const input of body.partners) {
      if (!isManagedRole(input.role)) throw createHttpError(400, `Role "${String(input.role)}" cannot be edited here`);
      const role = input.role;
      const partnerId = typeof input.businessPartnerId === 'string' && input.businessPartnerId ? input.businessPartnerId : null;

      if (!partnerId) {
        // Not linked to a business: only allowed when it is exactly what the day already has (free-text or open slot).
        const existing = oldManaged.find((p) => p.role === role && !p.businessPartnerId && (input.openForAll === true ? p.openForAll === true : p.name === input.name));
        if (!existing) throw createHttpError(400, `Choose a supplier for ${role}`);
        nextManaged.push(existing);
        continue;
      }

      const dupKey = `${role}:${partnerId}`;
      if (seen.has(dupKey)) continue;
      seen.add(dupKey);

      const unchanged = oldManaged.find((p) => p.role === role && p.businessPartnerId === partnerId);
      if (unchanged) {
        nextManaged.push(unchanged);
        continue;
      }

      const [partner] = await db
        .select({ id: businessPartners.id, name: businessPartners.name, type: businessPartners.type, approvalStatus: businessPartners.approvalStatus, isActive: businessPartners.isActive })
        .from(businessPartners)
        .where(eq(businessPartners.id, partnerId))
        .limit(1);
      if (!partner || partner.approvalStatus !== 'approved' || !partner.isActive) throw createHttpError(400, 'That supplier is not available');
      if (!(ITINERARY_ROLE_TO_PARTNER_TYPES[role] ?? []).includes(partner.type)) {
        throw createHttpError(400, `${partner.name} is a ${partner.type}, which can't fill the ${role} slot`);
      }
      if (destinationId && !(await partnerServes(partner.id, destinationId))) {
        throw createHttpError(400, `${partner.name} does not serve the destination chosen for this day`);
      }
      nextManaged.push({ role, name: partner.name, businessPartnerId: partner.id });
      added.push({ role, businessPartnerId: partner.id, name: partner.name });
    }

    const removed = oldManaged
      .filter((p) => p.businessPartnerId && !nextManaged.some((n) => n.role === p.role && n.businessPartnerId === p.businessPartnerId))
      .map((p) => ({ role: p.role as ManagedRole, businessPartnerId: p.businessPartnerId as string, name: p.name }));

    if (day.id) await applySupplierChanges(tourId, tour.title, day.id, requester, removed, added);

    const nextDay: StoredItineraryDay = {
      ...day,
      ...(typeof body.place === 'string' ? { destination: body.place.trim().slice(0, 200) } : {}),
      destinationId,
      partners: [...nextManaged, ...keptOther],
    };
    if (destinationId === null) delete nextDay.destinationId;
    const nextItinerary = itinerary.map((d, i) => (i === index ? nextDay : d));
    await TourService.updateTour(
      tourId,
      { itinerary: nextItinerary as unknown as Parameters<typeof TourService.updateTour>[1]['itinerary'] },
      requester.isAdmin ? undefined : requester.id,
    );

    req.params.dayKey = dayKey;
    return getDayDetail(req, res, next);
  } catch (error) {
    next(error);
  }
};


/** POST /operations/requests/:requestId/reassign — give one departure's declined/expired request to another business. */
export const reassignRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const businessPartnerId = (req.body as { businessPartnerId?: unknown }).businessPartnerId;
    if (typeof businessPartnerId !== 'string' || !businessPartnerId) throw createHttpError(400, 'businessPartnerId is required');
    const result = await ItineraryRequestService.reassignClosedRequest(req.params.requestId, requesterOf(req), businessPartnerId);
    return sendSuccess(res, result, 'Request sent to the new business');
  } catch (error) {
    next(error);
  }
};
