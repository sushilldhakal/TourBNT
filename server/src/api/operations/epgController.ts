import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { and, inArray, sql } from 'drizzle-orm';
import { db, globalDestinations, tours } from '../../db';
import { sendSuccess } from '../../utils/apiResponse';
import {
  addIsoDays,
  diffIsoDays,
  EPG_STATUSES,
  isIsoDate,
  projectEpg,
  type EpgBookingAgg,
  type EpgQuery,
  type EpgRequestAgg,
  type EpgStatusFilter,
} from './epgProjection';

const WINDOW_PAD_DAYS = 75;
const MAX_WINDOW_DAYS = 120;

const asRows = <T>(result: unknown): T[] => {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
};

const readIso = (value: unknown, label: string): string | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  if (!isIsoDate(value)) throw createHttpError(400, `${label} must be YYYY-MM-DD`);
  return value;
};

const utcToday = (): string => new Date().toISOString().slice(0, 10);

function parseQuery(req: Request): EpgQuery {
  const today = readIso(req.query.today, 'today') ?? utcToday();
  const from = readIso(req.query.from, 'from') ?? addIsoDays(today, -1);
  const to = readIso(req.query.to, 'to') ?? addIsoDays(today, 13);
  if (from > to) throw createHttpError(400, 'from must be on or before to');
  if (diffIsoDays(from, to) + 1 > MAX_WINDOW_DAYS) {
    throw createHttpError(400, `Date window cannot exceed ${MAX_WINDOW_DAYS} days`);
  }
  const statusRaw = typeof req.query.status === 'string' ? req.query.status : 'all';
  const status: EpgStatusFilter = (EPG_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw as EpgStatusFilter : 'all';
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
  return {
    from,
    to,
    today,
    status,
    q: text(req.query.q),
    destination: text(req.query.destination),
    guide: text(req.query.guide),
    transport: text(req.query.transport),
  };
}

/**
 * Tour operations timeline. One read of the tours this person can see, plus
 * one booking aggregate and one supplier-request read — the grid is projected
 * in memory from the itinerary template and each departure's start date.
 * GET /api/v1/operations/epg?from=&to=&today=&status=&q=&destination=&guide=&transport=
 */
export const getOperationsEpg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = parseQuery(req);
    const isAdmin = req.user!.roles.includes('admin');
    const filters = [inArray(tours.tourStatus, ['Published', 'Archived'])];
    if (!isAdmin) {
      filters.push(sql`exists (select 1 from tour_authors ta where ta.tour_id = ${tours.id} and ta.user_id = ${req.user!.id})`);
    }

    const tourRows = await db
      .select({
        id: tours.id,
        title: tours.title,
        code: tours.code,
        tourStatus: tours.tourStatus,
        maxSize: tours.maxSize,
        itinerary: tours.itinerary,
        tourDates: tours.tourDates,
        destination: globalDestinations.name,
      })
      .from(tours)
      .leftJoin(globalDestinations, sql`${globalDestinations.id} = ${tours.destinationId}`)
      .where(and(...filters));

    if (tourRows.length === 0) {
      return sendSuccess(res, projectEpg({ tours: [], bookings: [], requests: [], query }), 'Tour timeline retrieved successfully');
    }

    const tourIds = sql.join(tourRows.map((tour) => sql`${tour.id}`), sql`, `);
    const padFrom = addIsoDays(query.from, -WINDOW_PAD_DAYS);
    const padTo = addIsoDays(query.to, WINDOW_PAD_DAYS);

    const [bookingResult, requestResult] = await Promise.all([
      db.execute(sql`select b.tour_id as "tourId",
          to_char(b.departure_date::date, 'YYYY-MM-DD') as "departureDate",
          b.status,
          count(*)::int as bookings,
          sum(
            coalesce((b.participants->>'adults')::int, 0)
            + coalesce((b.participants->>'children')::int, 0)
            + coalesce((b.participants->>'infants')::int, 0)
          )::int as pax
        from bookings b
        where b.tour_id in (${tourIds})
          and b.departure_date::date between ${padFrom}::date and ${query.to}::date
        group by b.tour_id, b.departure_date::date, b.status`),
      db.execute(sql`select r.tour_id as "tourId", r.status, r.role,
          to_char(r.service_date, 'YYYY-MM-DD') as "serviceDate",
          to_char(r.source_departure_date::date, 'YYYY-MM-DD') as "sourceDepartureDate",
          to_char(r.counter_date, 'YYYY-MM-DD') as "counterDate",
          bp.name as "partnerName"
        from itinerary_partner_requests r
        join business_partners bp on bp.id = r.business_partner_id
        where r.tour_id in (${tourIds})
          and r.service_date between ${padFrom}::date and ${padTo}::date`),
    ]);

    const bookings: EpgBookingAgg[] = asRows<EpgBookingAgg>(bookingResult).map((row) => ({
      tourId: String(row.tourId),
      departureDate: String(row.departureDate),
      status: String(row.status),
      bookings: Number(row.bookings) || 0,
      pax: Number(row.pax) || 0,
    }));
    const requests: EpgRequestAgg[] = asRows<EpgRequestAgg>(requestResult).map((row) => ({
      tourId: String(row.tourId),
      status: String(row.status),
      role: String(row.role),
      serviceDate: String(row.serviceDate),
      sourceDepartureDate: row.sourceDepartureDate ? String(row.sourceDepartureDate) : null,
      counterDate: row.counterDate ? String(row.counterDate) : null,
      partnerName: row.partnerName ? String(row.partnerName) : '',
    }));

    const epg = projectEpg({ tours: tourRows, bookings, requests, query });
    return sendSuccess(res, epg, 'Tour timeline retrieved successfully');
  } catch (error) {
    next(error);
  }
};
