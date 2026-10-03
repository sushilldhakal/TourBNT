import { Request, Response, NextFunction } from 'express';
import { db, bookings, businessPartners, businessPartnerUnitTypes, itineraryPartnerRequests } from '../../db';
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


// ---------------------------------------------------------------------------
// Paginated drill-downs behind the Operations tabs
// ---------------------------------------------------------------------------

const parsePage = (req: Request) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  return { page, limit, offset: (page - 1) * limit };
};
const strParam = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const REQUEST_STATUSES = ['pending', 'held', 'confirmed', 'countered', 'declined', 'expired'];
const REQUEST_ROLES = ['transport', 'accommodation', 'guide', 'meals', 'other'];
const SUPPLIER_TYPES = ['hotel', 'guesthouse', 'restaurant', 'guide', 'transport'];

/**
 * Supplier requests (every itinerary_partner_requests row) with tour + partner
 * context. GET /api/v1/operations/requests?status=&role=&q=&page=&limit=
 */
export const getOperationsRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePage(req);
    const status = strParam(req.query.status);
    const role = strParam(req.query.role);
    const q = strParam(req.query.q);

    const filters = [sql`true`];
    if (status && REQUEST_STATUSES.includes(status)) filters.push(sql`r.status = ${status}`);
    if (role && REQUEST_ROLES.includes(role)) filters.push(sql`r.role = ${role}`);
    if (q) { const like = `%${q}%`; filters.push(sql`(t.title ilike ${like} or t.code ilike ${like} or bp.name ilike ${like})`); }
    const where = sql.join(filters, sql` and `);

    const from = sql`from itinerary_partner_requests r
      join tours t on t.id = r.tour_id
      join business_partners bp on bp.id = r.business_partner_id
      left join business_partner_unit_types ut on ut.id = r.unit_type_id`;

    const [rows, totalRows, statusRows] = await Promise.all([
      db.execute(sql`select r.id, r.tour_id as "tourId", t.title as "tourTitle", t.code as "tourCode", bp.id as "partnerId", bp.name as "partnerName", bp.type as "partnerType",
          r.role, r.service_date::text as "serviceDate", r.service_time as "serviceTime", r.headcount, r.units_requested as "unitsRequested", ut.name as "unitType",
          r.status, r.capacity_confirmed as "capacityConfirmed", r.response_notes as "responseNotes", r.counter_units as "counterUnits", r.counter_date::text as "counterDate",
          r.counter_notes as "counterNotes", r.hold_expires_at as "holdExpiresAt", r.respond_by_at as "respondByAt", r.updated_at as "updatedAt"
        ${from} where ${where} order by r.service_date asc, r.created_at desc limit ${limit} offset ${offset}`),
      db.execute<{ value: number }>(sql`select count(*)::int as value ${from} where ${where}`),
      db.execute<{ status: string; value: number }>(sql`select r.status, count(*)::int as value from itinerary_partner_requests r group by r.status`),
    ]);

    const totalItems = Number(totalRows[0]?.value ?? 0);
    const counts: Record<string, number> = {};
    for (const r of statusRows) counts[r.status] = Number(r.value);
    return res.json({ success: true, items: rows, counts, pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } });
  } catch (error) {
    next(error);
  }
};

/**
 * Upcoming trips: one row per (tour, departure date) that has live bookings,
 * with the tour's supplier-confirmation rollup.
 * GET /api/v1/operations/trips?q=&page=&limit=
 */
export const getOperationsTrips = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePage(req);
    const q = strParam(req.query.q);
    const search = q ? sql`and (t.title ilike ${`%${q}%`} or t.code ilike ${`%${q}%`})` : sql``;

    const trips = sql`with trips as (
        select b.tour_id, b.departure_date::date as departure, count(*)::int as bookings,
               sum((b.participants->>'adults')::int + (b.participants->>'children')::int + (b.participants->>'infants')::int)::int as pax,
               sum(coalesce((b.pricing->>'totalPrice')::float, 0)) as revenue,
               count(*) filter (where b.status = 'confirmed')::int as confirmed_bookings
        from bookings b
        where b.status in ('pending', 'confirmed') and b.departure_date >= now()
        group by b.tour_id, b.departure_date::date
      )`;

    const [rows, totalRows] = await Promise.all([
      db.execute(sql`${trips}
        select tr.tour_id as "tourId", t.title, t.code, t.cover_image as "coverImage", gd.name as destination, tr.departure::text as departure, tr.bookings, tr.pax,
               tr.revenue, tr.confirmed_bookings as "confirmedBookings",
               coalesce(rq.total, 0)::int as "requestsTotal", coalesce(rq.confirmed, 0)::int as "requestsConfirmed", coalesce(rq.problems, 0)::int as "requestsProblem"
        from trips tr
        join tours t on t.id = tr.tour_id
        left join global_destinations gd on gd.id = t.destination_id
        left join lateral (
          select count(*) as total, count(*) filter (where r.status = 'confirmed') as confirmed, count(*) filter (where r.status in ('declined', 'expired')) as problems
          from itinerary_partner_requests r where r.tour_id = tr.tour_id
        ) rq on true
        where true ${search}
        order by tr.departure asc limit ${limit} offset ${offset}`),
      db.execute<{ value: number }>(sql`${trips} select count(*)::int as value from trips tr join tours t on t.id = tr.tour_id where true ${search}`),
    ]);

    const totalItems = Number(totalRows[0]?.value ?? 0);
    return res.json({ success: true, items: rows, pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } });
  } catch (error) {
    next(error);
  }
};

/**
 * Approved suppliers with inventory + open-request workload.
 * GET /api/v1/operations/suppliers?type=&q=&page=&limit=
 */
export const getOperationsSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePage(req);
    const type = strParam(req.query.type);
    const q = strParam(req.query.q);

    const filters = [sql`bp.approval_status = 'approved'`, sql`bp.type in ('hotel','guesthouse','restaurant','guide','transport')`];
    if (type && SUPPLIER_TYPES.includes(type)) filters.push(sql`bp.type = ${type}`);
    if (q) filters.push(sql`bp.name ilike ${`%${q}%`}`);
    const where = sql.join(filters, sql` and `);

    const [rows, totalRows, typeRows] = await Promise.all([
      db.execute(sql`select bp.id, bp.name, bp.type, bp.address->>'city' as city, bp.average_rating as "averageRating", bp.is_active as "isActive", bp.phone, bp.email,
          coalesce((select sum(total_units) from business_partner_unit_types ut where ut.business_partner_id = bp.id and ut.is_active), 0)::int as "totalUnits",
          coalesce((select unit_label from business_partner_capacity c where c.business_partner_id = bp.id), 'unit') as "unitLabel",
          (select count(*) from itinerary_partner_requests r where r.business_partner_id = bp.id and r.status in ('pending','held','countered'))::int as "openRequests",
          (select count(*) from itinerary_partner_requests r where r.business_partner_id = bp.id and r.status = 'confirmed')::int as "confirmedRequests",
          (select count(*) from itinerary_partner_requests r where r.business_partner_id = bp.id and r.status in ('declined','expired'))::int as "problemRequests"
        from business_partners bp where ${where} order by "openRequests" desc, bp.name asc limit ${limit} offset ${offset}`),
      db.execute<{ value: number }>(sql`select count(*)::int as value from business_partners bp where ${where}`),
      db.execute<{ type: string; value: number }>(sql`select bp.type, count(*)::int as value from business_partners bp where bp.approval_status = 'approved' group by bp.type`),
    ]);

    const totalItems = Number(totalRows[0]?.value ?? 0);
    const counts: Record<string, number> = {};
    for (const r of typeRows) counts[r.type] = Number(r.value);
    return res.json({ success: true, items: rows, counts, pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } });
  } catch (error) {
    next(error);
  }
};

const OPEN_STATUSES = ['pending', 'held', 'countered', 'declined', 'expired'];

/**
 * "Needs attention": every upcoming supplier request that isn't confirmed yet (no reply, a proposed change,
 * declined, expired, or only held) on published tours, soonest service date first, so whoever runs the tours
 * can call the supplier, accept a change or swap the supplier before the day. Problems sort before rows that
 * are just waiting on the same day.
 *
 * Sellers see their own tours (any tour they are an author of); admins see everyone's.
 * The actions themselves use the existing per-tour endpoints (counter-response, reopen, replace), which
 * check access again.
 * GET /api/v1/operations/attention?status=&role=&tourId=&q=&page=&limit=
 */
export const getOperationsAttention = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePage(req);
    const status = strParam(req.query.status);
    const role = strParam(req.query.role);
    const tourId = strParam(req.query.tourId);
    const q = strParam(req.query.q);
    const isAdmin = req.user!.roles.includes('admin');

    // Upcoming, not-yet-confirmed requests on published tours this person runs.
    const base = [
      sql`r.status in ('pending','held','countered','declined','expired')`,
      sql`r.service_date >= current_date`,
      sql`t.tour_status = 'Published'`,
    ];
    if (!isAdmin) base.push(sql`exists (select 1 from tour_authors ta where ta.tour_id = r.tour_id and ta.user_id = ${req.user!.id})`);
    const baseWhere = sql.join(base, sql` and `);

    const filters = [...base];
    if (status && OPEN_STATUSES.includes(status)) filters.push(sql`r.status = ${status}`);
    if (role && REQUEST_ROLES.includes(role)) filters.push(sql`r.role = ${role}`);
    if (tourId) filters.push(sql`r.tour_id = ${tourId}`);
    if (q) { const like = `%${q}%`; filters.push(sql`(t.title ilike ${like} or t.code ilike ${like} or bp.name ilike ${like})`); }
    const where = sql.join(filters, sql` and `);

    const from = sql`from itinerary_partner_requests r
      join tours t on t.id = r.tour_id
      join business_partners bp on bp.id = r.business_partner_id
      left join business_partner_unit_types ut on ut.id = r.unit_type_id`;

    const [rows, totalRows, statusRows, tourRows] = await Promise.all([
      db.execute(sql`select r.id, r.tour_id as "tourId", t.title as "tourTitle", t.code as "tourCode", t.destination_id as "tourDestinationId",
          r.tour_itinerary_partner_id as "tourItineraryPartnerId",
          bp.id as "businessPartnerId", bp.name as "partnerName", bp.type as "partnerType", bp.phone as "partnerPhone", bp.email as "partnerEmail",
          r.role, r.service_date::text as "serviceDate", r.service_time as "serviceTime", r.headcount, r.units_requested as "unitsRequested",
          coalesce(ut.name, tip.unit_type) as "unitType",
          r.status, r.response_notes as "responseNotes", r.counter_units as "counterUnits", r.counter_date::text as "counterDate",
          r.counter_time as "counterTime", r.counter_notes as "counterNotes", r.hold_expires_at as "holdExpiresAt", r.respond_by_at as "respondByAt",
          (r.service_date - current_date)::int as "daysUntil",
          coalesce((select sum(c.headcount) from itinerary_request_booking_contributions c where c.request_id = r.id), 0)::int as "bookedTravellers"
        ${from}
        left join tour_itinerary_partners tip on tip.id = r.tour_itinerary_partner_id
        where ${where}
        order by r.service_date asc,
          case r.status when 'declined' then 0 when 'expired' then 1 when 'countered' then 2 when 'pending' then 3 else 4 end,
          r.service_time asc nulls first, t.title asc
        limit ${limit} offset ${offset}`),
      db.execute<{ value: number }>(sql`select count(*)::int as value ${from} where ${where}`),
      // Counts for the filter chips: everything open for this person, ignoring the chips' own filter.
      db.execute<{ status: string; value: number; within7: number }>(sql`select r.status, count(*)::int as value,
          count(*) filter (where r.service_date < current_date + 7)::int as "within7"
        ${from} where ${baseWhere} group by r.status`),
      db.execute(sql`select distinct t.id, t.title, t.code ${from} where ${baseWhere} order by t.title`),
    ]);

    const totalItems = Number(totalRows[0]?.value ?? 0);
    const counts: Record<string, number> = {};
    let within7Days = 0;
    for (const r of statusRows) { counts[r.status] = Number(r.value); within7Days += Number(r.within7); }
    return res.json({
      success: true,
      items: rows,
      counts,
      within7Days,
      tours: tourRows,
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    });
  } catch (error) {
    next(error);
  }
};
