import { Request, Response, NextFunction } from 'express';
import { db, bookings, businessPartners, businessPartnerUnitTypes, itineraryPartnerRequests } from '@tourbnt/db';
import { and, eq, inArray, gte, sql } from 'drizzle-orm';
import { sendSuccess } from '../../utils/apiResponse';

/**
 * Portfolio-wide snapshot for TourBNT staff: active trips, supplier counts,
 * and an alerts feed of what needs attention right now — see
 * itineraryRequestService.ts for how each request's status is derived.
 * GET /api/v1/operations/summary
 */
export const getOperationsSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();

    const [
      [{ value: activeTrips }],
      [{ value: hotels }],
      [{ value: restaurants }],
      [{ value: guides }],
      [{ value: vehicles }],
      [{ value: missingConfirmations }],
      [{ value: hotelUnavailable }],
      [{ value: transportMissing }],
      [{ value: guidesCancelled }],
      [{ value: bookingsConfirmed }],
    ] = await Promise.all([
      db.select({ value: sql<number>`count(distinct ${bookings.tourId})` }).from(bookings)
        .where(and(inArray(bookings.status, ['pending', 'confirmed']), gte(bookings.departureDate, now))),
      db.select({ value: sql<number>`count(*)` }).from(businessPartners)
        .where(and(inArray(businessPartners.type, ['hotel', 'guesthouse']), eq(businessPartners.approvalStatus, 'approved'), eq(businessPartners.isActive, true))),
      db.select({ value: sql<number>`count(*)` }).from(businessPartners)
        .where(and(eq(businessPartners.type, 'restaurant'), eq(businessPartners.approvalStatus, 'approved'), eq(businessPartners.isActive, true))),
      db.select({ value: sql<number>`count(*)` }).from(businessPartners)
        .where(and(eq(businessPartners.type, 'guide'), eq(businessPartners.approvalStatus, 'approved'), eq(businessPartners.isActive, true))),
      // "Vehicles" is the actual fleet size (sum of each transport partner's
      // vehicle-type totals), not a count of transport companies.
      db.select({ value: sql<number>`COALESCE(SUM(${businessPartnerUnitTypes.totalUnits}), 0)` }).from(businessPartnerUnitTypes)
        .innerJoin(businessPartners, eq(businessPartnerUnitTypes.businessPartnerId, businessPartners.id))
        .where(and(eq(businessPartners.type, 'transport'), eq(businessPartners.approvalStatus, 'approved'), eq(businessPartners.isActive, true), eq(businessPartnerUnitTypes.isActive, true))),
      db.select({ value: sql<number>`count(*)` }).from(itineraryPartnerRequests)
        .where(inArray(itineraryPartnerRequests.status, ['pending', 'held', 'countered'])),
      db.select({ value: sql<number>`count(*)` }).from(itineraryPartnerRequests)
        .where(and(eq(itineraryPartnerRequests.role, 'accommodation'), inArray(itineraryPartnerRequests.status, ['declined', 'expired']))),
      db.select({ value: sql<number>`count(*)` }).from(itineraryPartnerRequests)
        .where(and(eq(itineraryPartnerRequests.role, 'transport'), inArray(itineraryPartnerRequests.status, ['declined', 'expired']))),
      db.select({ value: sql<number>`count(*)` }).from(itineraryPartnerRequests)
        .where(and(eq(itineraryPartnerRequests.role, 'guide'), eq(itineraryPartnerRequests.status, 'declined'))),
      db.select({ value: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, 'confirmed')),
    ]);

    return sendSuccess(res, {
      activeTrips: Number(activeTrips),
      partnerCounts: {
        hotels: Number(hotels),
        restaurants: Number(restaurants),
        guides: Number(guides),
        vehicles: Number(vehicles),
      },
      alerts: {
        missingConfirmations: Number(missingConfirmations),
        hotelUnavailable: Number(hotelUnavailable),
        transportMissing: Number(transportMissing),
        guidesCancelled: Number(guidesCancelled),
        bookingsConfirmed: Number(bookingsConfirmed),
      },
    }, 'Operations summary retrieved successfully');
  } catch (error) {
    next(error);
  }
};
