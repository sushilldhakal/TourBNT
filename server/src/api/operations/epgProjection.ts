/**
 * Projects the existing tour + departure + itinerary into a read-only
 * operations timeline (an EPG). Nothing here is stored.
 *
 * Date rule, shared with ItineraryRequestService: a departure's calendar
 * day N is `start + (N - 1)`, where N is the itinerary array index. The
 * itinerary is a template reused by every departure of the package, so a
 * per-day `date` on the template is ignored — Oct 7 is Day 3 only for a
 * departure that started Oct 5.
 *
 * The shift scheduler's hourly grid is a different model (resource × hour,
 * drag/resize). This projection is departure × calendar date.
 */

export const EPG_STATUSES = [
  'all',
  'running',
  'upcoming',
  'starting-today',
  'ending-today',
  'completed',
  'cancelled',
  'delayed',
  'attention',
] as const;

export type EpgStatusFilter = (typeof EPG_STATUSES)[number];
export type EpgOperationalStatus = Exclude<EpgStatusFilter, 'all' | 'starting-today' | 'ending-today'>;

export interface EpgQuery {
  from: string;
  to: string;
  today: string;
  q?: string;
  status: EpgStatusFilter;
  destination?: string;
  guide?: string;
  transport?: string;
  limit?: number;
}

export interface EpgSourceTour {
  id: string;
  title: string;
  code: string;
  tourStatus: string;
  maxSize: number | null;
  destination: string | null;
  itinerary: unknown;
  tourDates: unknown;
}

export interface EpgBookingAgg {
  tourId: string;
  departureDate: string;
  status: string;
  bookings: number;
  pax: number;
}

export interface EpgRequestAgg {
  tourId: string;
  status: string;
  role: string;
  serviceDate: string;
  sourceDepartureDate: string | null;
  counterDate: string | null;
  partnerName: string;
}

export type TransportKind = 'flight' | 'road' | 'trek' | 'boat' | 'safari';

/** What one business has been asked to provide on one calendar day (partner scope only). */
export interface EpgPartnerService {
  requestId: string;
  partnerId: string;
  partnerName: string;
  role: string;
  status: string;
  serviceTime: string | null;
  serviceEndTime: string | null;
  headcount: number;
  unitsRequested: number;
  capacityConfirmed: number | null;
  unitType: string | null;
  counterDate: string | null;
}

export interface EpgDay {
  index: number;
  dayNumber: number;
  date: string;
  dayId?: string;
  title: string;
  destination: string;
  accommodation: string | null;
  guide: string | null;
  transport: string | null;
  vehicle: string | null;
  activity: string | null;
  transportKind: TransportKind | null;
  /** Present only in partner scope: this business's own services on this day. */
  services?: EpgPartnerService[];
}

export interface EpgDeparture {
  id: string;
  tourId: string;
  title: string;
  code: string;
  departureLabel: string;
  /** Tour-package destination (global destination), when the tour has one. */
  destination: string | null;
  startDate: string;
  endDate: string;
  totalDays: number;
  guestCount: number;
  bookingCount: number;
  capacity: number | null;
  status: EpgOperationalStatus;
  /** True when a linked supplier request on this departure is declined or expired. */
  needsAttention: boolean;
  /** True when a linked supplier request on this departure is countered. */
  delayed: boolean;
  cancelled: boolean;
  currentDay: number | null;
  guideName: string | null;
  todayStop: EpgDay | null;
  nextStop: EpgDay | null;
  issues: string[];
  /** Itinerary days whose calendar date falls inside the requested window. */
  days: EpgDay[];
}

export interface EpgProjection {
  /** `all` = tour operator view; `partner` = only what the caller's own businesses were asked to provide. */
  scope?: 'all' | 'partner';
  /** Partner scope: the caller's own businesses this view covers. */
  partners?: { id: string; name: string; type: string }[];
  from: string;
  to: string;
  today: string;
  dates: string[];
  truncated: boolean;
  totalMatched: number;
  counts: Record<EpgStatusFilter, number>;
  facets: {
    destinations: string[];
    guides: string[];
    transports: string[];
  };
  departures: EpgDeparture[];
}

const ISO_DATE = /^(\d{4}-\d{2}-\d{2})/;
const MAX_RECURRENCE = 120;
const DEFAULT_LIMIT = 400;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Calendar date as YYYY-MM-DD. Date-only strings keep their prefix so a local offset cannot shift the day. */
export function parseIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== 'string') return null;
  const match = value.match(ISO_DATE);
  if (!match) return null;
  return isIsoDate(match[1]) ? match[1] : null;
}

export function addIsoDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function diffIsoDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function eachIsoDate(from: string, to: string): string[] {
  if (from > to) return [];
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addIsoDays(cursor, 1);
  }
  return dates;
}

interface Partner {
  role: string;
  name: string;
  unitType?: string;
}

interface ItineraryDay {
  id?: string;
  day?: string;
  title: string;
  destination: string;
  partners: Partner[];
}

interface PlannedStart {
  key: string;
  label: string;
  start: string;
  capacity?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function partnersOf(value: unknown): Partner[] {
  if (!Array.isArray(value)) return [];
  const partners: Partner[] = [];
  for (const raw of value) {
    const record = asRecord(raw);
    if (!record || typeof record.role !== 'string' || typeof record.name !== 'string') continue;
    const name = record.name.trim();
    if (!name) continue;
    partners.push({
      role: record.role,
      name,
      ...(typeof record.unitType === 'string' && record.unitType.trim() ? { unitType: record.unitType.trim() } : {}),
    });
  }
  return partners;
}

function itineraryOf(value: unknown): ItineraryDay[] {
  if (!Array.isArray(value)) return [];
  const days: ItineraryDay[] = [];
  for (const raw of value) {
    const record = asRecord(raw);
    if (!record) continue;
    days.push({
      ...(typeof record.id === 'string' && record.id ? { id: record.id } : {}),
      ...(typeof record.day === 'string' ? { day: record.day } : {}),
      title: typeof record.title === 'string' ? record.title.trim() : '',
      destination: typeof record.destination === 'string' ? record.destination.trim() : '',
      partners: partnersOf(record.partners),
    });
  }
  return days;
}

function inferTransportKind(text: string, hasTransport: boolean): TransportKind | null {
  const s = text.toLowerCase();
  if (/heli|flight|\bfly\b|plane|airport/.test(s)) return 'flight';
  if (/safari|elephant/.test(s)) return 'safari';
  if (/boat|canoe|raft|ferry/.test(s)) return 'boat';
  if (/trek|hike|\bwalk\b|on foot/.test(s)) return 'trek';
  if (hasTransport || /bus|coach|jeep|van|\bcar\b|4x4|taxi|drive|transfer|hiace/.test(s)) return 'road';
  return null;
}

function projectItinerary(days: ItineraryDay[], start: string): EpgDay[] {
  return days.map((day, index) => {
    const accommodation = day.partners.find((p) => p.role === 'accommodation');
    const guide = day.partners.find((p) => p.role === 'guide');
    const transport = day.partners.find((p) => p.role === 'transport');
    const activityPartner = day.partners.find((p) => p.role === 'other');
    const place = day.destination || day.title;
    const transportText = [transport?.name, transport?.unitType].filter(Boolean).join(' ');
    const activity = day.title && day.title !== place ? day.title : (activityPartner?.name ?? null);
    return {
      index,
      dayNumber: index + 1,
      date: addIsoDays(start, index),
      ...(day.id ? { dayId: day.id } : {}),
      title: day.title,
      destination: place,
      accommodation: accommodation?.name ?? null,
      guide: guide?.name ?? null,
      transport: transport?.name ?? null,
      vehicle: transport?.unitType ?? null,
      activity,
      transportKind: inferTransportKind(`${transportText} ${day.title} ${activityPartner?.name ?? ''}`, Boolean(transport)),
    };
  });
}

function nextOccurrence(iso: string, pattern: string, interval: number): string | null {
  const step = Math.max(1, interval || 1);
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  switch (pattern) {
    case 'daily':
      dt.setUTCDate(dt.getUTCDate() + step);
      break;
    case 'weekly':
      dt.setUTCDate(dt.getUTCDate() + 7 * step);
      break;
    case 'biweekly':
      dt.setUTCDate(dt.getUTCDate() + 14 * step);
      break;
    case 'monthly':
      dt.setUTCMonth(dt.getUTCMonth() + step);
      break;
    case 'quarterly':
      dt.setUTCMonth(dt.getUTCMonth() + 3 * step);
      break;
    case 'yearly':
      dt.setUTCFullYear(dt.getUTCFullYear() + step);
      break;
    default:
      return null;
  }
  return dt.toISOString().slice(0, 10);
}

function expandStarts(
  start: string,
  recurring: boolean,
  pattern: string | undefined,
  interval: number | undefined,
  recurrenceEnd: string | undefined,
  windowFrom: string,
  windowTo: string,
  duration: number,
): string[] {
  if (!recurring || !pattern) return [start];
  const limit = recurrenceEnd && recurrenceEnd >= start ? recurrenceEnd : start;
  const starts: string[] = [];
  let cursor: string | null = start;
  let guard = 0;
  while (cursor && guard < MAX_RECURRENCE) {
    if (cursor > limit || cursor > windowTo) break;
    const end = addIsoDays(cursor, Math.max(duration, 1) - 1);
    if (end >= windowFrom) starts.push(cursor);
    const next = nextOccurrence(cursor, pattern, interval ?? 1);
    if (!next || next <= cursor) break;
    cursor = next;
    guard += 1;
  }
  return starts.length > 0 ? starts : [start].filter((s) => addIsoDays(s, Math.max(duration, 1) - 1) >= windowFrom && s <= windowTo);
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function plannedStarts(tourDates: unknown, duration: number, windowFrom: string, windowTo: string): PlannedStart[] {
  const dates = asRecord(tourDates);
  if (!dates) return [];
  const schedule = typeof dates.scheduleType === 'string' ? dates.scheduleType : '';
  const planned: PlannedStart[] = [];

  if (schedule === 'multiple' && Array.isArray(dates.departures)) {
    for (const raw of dates.departures) {
      const dep = asRecord(raw);
      if (!dep) continue;
      const range = asRecord(dep.dateRange);
      const start = parseIsoDate(range?.from);
      if (!start) continue;
      const recurrenceEnd = parseIsoDate(dep.recurrenceEndDate) ?? undefined;
      const pattern = typeof dep.recurrencePattern === 'string' ? dep.recurrencePattern : undefined;
      const starts = expandStarts(
        start,
        Boolean(dep.isRecurring) && Boolean(pattern) && Boolean(recurrenceEnd),
        pattern,
        numberOrUndefined(dep.recurrenceInterval),
        recurrenceEnd,
        windowFrom,
        windowTo,
        duration,
      );
      const label = typeof dep.label === 'string' && dep.label.trim() ? dep.label.trim() : 'Departure';
      const id = typeof dep.id === 'string' && dep.id ? dep.id : start;
      for (const occurrence of starts) {
        planned.push({
          key: `${id}:${occurrence}`,
          label,
          start: occurrence,
          capacity: numberOrUndefined(dep.capacity),
        });
      }
    }
    return planned;
  }

  if (schedule === 'fixed' || schedule === 'recurring') {
    const range = asRecord(dates.defaultDateRange) ?? asRecord(dates.dateRange);
    const start = parseIsoDate(range?.from);
    if (!start) return [];
    const recurrenceEnd = parseIsoDate(dates.recurrenceEndDate) ?? undefined;
    const pattern = typeof dates.recurrencePattern === 'string' ? dates.recurrencePattern : undefined;
    const recurring = schedule === 'recurring' || Boolean(dates.isRecurring);
    const starts = expandStarts(
      start,
      recurring && Boolean(pattern) && Boolean(recurrenceEnd),
      pattern,
      numberOrUndefined(dates.recurrenceInterval),
      recurrenceEnd,
      windowFrom,
      windowTo,
      duration,
    );
    for (const occurrence of starts) {
      planned.push({ key: `fixed:${occurrence}`, label: 'Fixed departure', start: occurrence });
    }
  }

  return planned;
}

function overlaps(start: string, end: string, from: string, to: string): boolean {
  return start <= to && end >= from;
}

const ROLE_LABEL: Record<string, string> = {
  transport: 'Transport',
  accommodation: 'Hotel',
  guide: 'Guide',
  meals: 'Meals',
  other: 'Activity',
};

interface BuiltRow {
  row: EpgDeparture;
  guides: string[];
  transports: string[];
  destinations: string[];
  search: string;
}

function emptyCounts(): Record<EpgStatusFilter, number> {
  return {
    all: 0,
    running: 0,
    upcoming: 0,
    'starting-today': 0,
    'ending-today': 0,
    completed: 0,
    cancelled: 0,
    delayed: 0,
    attention: 0,
  };
}

function matchesStatus(row: EpgDeparture, status: EpgStatusFilter, today: string): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'running':
      return !row.cancelled && row.startDate <= today && today <= row.endDate;
    case 'upcoming':
      return !row.cancelled && row.startDate > today;
    case 'starting-today':
      return !row.cancelled && row.startDate === today;
    case 'ending-today':
      return !row.cancelled && row.endDate === today;
    case 'completed':
      return !row.cancelled && row.endDate < today;
    case 'cancelled':
      return row.cancelled;
    case 'delayed':
      return row.delayed && !row.cancelled;
    case 'attention':
      return row.needsAttention && !row.cancelled;
    default:
      return true;
  }
}

function bumpCounts(counts: Record<EpgStatusFilter, number>, row: EpgDeparture, today: string) {
  (Object.keys(counts) as EpgStatusFilter[]).forEach((status) => {
    if (matchesStatus(row, status, today)) counts[status] += 1;
  });
}

function rank(row: EpgDeparture, today: string): number {
  const onRoad = !row.cancelled && row.startDate <= today && today <= row.endDate;
  if (onRoad && (row.needsAttention || row.delayed)) return 0;
  if (onRoad) return 1;
  if (!row.cancelled && row.startDate === today) return 2;
  if (!row.cancelled && row.startDate > today) return 3;
  if (row.cancelled) return 5;
  return 4;
}

export function projectEpg(input: {
  tours: EpgSourceTour[];
  bookings: EpgBookingAgg[];
  requests: EpgRequestAgg[];
  query: EpgQuery;
  /** Drop a departure before it is searched, faceted or counted. */
  include?: (row: EpgDeparture) => boolean;
}): EpgProjection {
  const { query } = input;
  const limit = query.limit ?? DEFAULT_LIMIT;
  const dates = eachIsoDate(query.from, query.to);

  const bookingsByTour = new Map<string, EpgBookingAgg[]>();
  for (const booking of input.bookings) {
    const date = parseIsoDate(booking.departureDate);
    if (!date) continue;
    const list = bookingsByTour.get(booking.tourId) ?? [];
    list.push({ ...booking, departureDate: date });
    bookingsByTour.set(booking.tourId, list);
  }

  const requestsByTour = new Map<string, EpgRequestAgg[]>();
  for (const request of input.requests) {
    const serviceDate = parseIsoDate(request.serviceDate);
    if (!serviceDate) continue;
    const list = requestsByTour.get(request.tourId) ?? [];
    list.push({
      ...request,
      serviceDate,
      sourceDepartureDate: request.sourceDepartureDate ? parseIsoDate(request.sourceDepartureDate) : null,
      counterDate: request.counterDate ? parseIsoDate(request.counterDate) : null,
    });
    requestsByTour.set(request.tourId, list);
  }

  const built: BuiltRow[] = [];

  for (const tour of input.tours) {
    if (tour.tourStatus === 'Draft') continue;
    const itinerary = itineraryOf(tour.itinerary);
    const duration = itinerary.length || numberOrUndefined(asRecord(tour.tourDates)?.days) || 1;
    const span = Math.max(duration, 1);
    const planned = plannedStarts(tour.tourDates, span, query.from, query.to);
    const seen = new Set(planned.map((p) => p.start));

    for (const booking of bookingsByTour.get(tour.id) ?? []) {
      if (seen.has(booking.departureDate)) continue;
      seen.add(booking.departureDate);
      planned.push({
        key: `booked:${booking.departureDate}`,
        label: 'Booked departure',
        start: booking.departureDate,
      });
    }

    const tourBookings = bookingsByTour.get(tour.id) ?? [];
    const tourRequests = requestsByTour.get(tour.id) ?? [];

    for (const plan of planned) {
      const end = addIsoDays(plan.start, span - 1);
      if (!overlaps(plan.start, end, query.from, query.to)) continue;

      const days = projectItinerary(itinerary, plan.start);
      const onThisDeparture = tourBookings.filter((b) => b.departureDate === plan.start);
      let guestCount = 0;
      let bookingCount = 0;
      let cancelledBookings = 0;
      for (const booking of onThisDeparture) {
        if (booking.status === 'cancelled') {
          cancelledBookings += booking.bookings;
          continue;
        }
        guestCount += booking.pax;
        bookingCount += booking.bookings;
      }
      const cancelled = cancelledBookings > 0 && bookingCount === 0;

      const linkedRequests = tourRequests.filter((request) => {
        if (request.sourceDepartureDate) return request.sourceDepartureDate === plan.start;
        return request.serviceDate >= plan.start && request.serviceDate <= end;
      });
      const needsAttention = linkedRequests.some((request) => request.status === 'declined' || request.status === 'expired');
      const delayed = linkedRequests.some((request) => request.status === 'countered');
      const issues = linkedRequests
        .filter((request) => request.status === 'declined' || request.status === 'expired' || request.status === 'countered')
        .slice(0, 3)
        .map((request) => `${ROLE_LABEL[request.role] ?? request.role} ${request.status}${request.partnerName ? `: ${request.partnerName}` : ''}`);

      let status: EpgOperationalStatus;
      if (cancelled) status = 'cancelled';
      else if (needsAttention) status = 'attention';
      else if (delayed) status = 'delayed';
      else if (query.today < plan.start) status = 'upcoming';
      else if (query.today > end) status = 'completed';
      else status = 'running';

      const currentDay = query.today >= plan.start && query.today <= end ? diffIsoDays(plan.start, query.today) + 1 : null;
      const todayStop = currentDay != null ? days[currentDay - 1] ?? null : null;
      const nextStop = currentDay != null
        ? days[currentDay] ?? null
        : query.today < plan.start
          ? days[0] ?? null
          : null;

      const guides = [...new Set(days.map((day) => day.guide).filter((name): name is string => Boolean(name)))];
      const transports = [...new Set(days.map((day) => day.transport).filter((name): name is string => Boolean(name)))];
      const destinations = [...new Set([tour.destination, ...days.map((day) => day.destination)].filter((name): name is string => Boolean(name)))];
      const guideName = todayStop?.guide ?? guides[0] ?? null;

      const row: EpgDeparture = {
        id: `${tour.id}:${plan.key}`,
        tourId: tour.id,
        title: tour.title,
        code: tour.code,
        departureLabel: plan.label,
        destination: tour.destination,
        startDate: plan.start,
        endDate: end,
        totalDays: span,
        guestCount,
        bookingCount,
        capacity: plan.capacity ?? (typeof tour.maxSize === 'number' ? tour.maxSize : null),
        status,
        needsAttention,
        delayed,
        cancelled,
        currentDay,
        guideName,
        todayStop,
        nextStop,
        issues,
        days: days.filter((day) => day.date >= query.from && day.date <= query.to),
      };

      if (input.include && !input.include(row)) continue;

      const search = [
        tour.title,
        tour.code,
        plan.label,
        tour.destination,
        ...destinations,
        ...guides,
        ...transports,
        ...days.map((day) => day.activity ?? ''),
      ].join(' ').toLowerCase();

      built.push({ row, guides, transports, destinations, search });
    }
  }

  const needle = query.q?.trim().toLowerCase();
  const searched = needle ? built.filter((item) => item.search.includes(needle)) : built;

  const facetDestinations = new Set<string>();
  const facetGuides = new Set<string>();
  const facetTransports = new Set<string>();
  for (const item of searched) {
    item.destinations.forEach((name) => facetDestinations.add(name));
    item.guides.forEach((name) => facetGuides.add(name));
    item.transports.forEach((name) => facetTransports.add(name));
  }

  const faceted = searched.filter((item) => {
    if (query.destination && !item.destinations.includes(query.destination)) return false;
    if (query.guide && !item.guides.includes(query.guide)) return false;
    if (query.transport && !item.transports.includes(query.transport)) return false;
    return true;
  });

  const counts = emptyCounts();
  for (const item of faceted) bumpCounts(counts, item.row, query.today);

  const matched = faceted
    .filter((item) => matchesStatus(item.row, query.status, query.today))
    .sort((a, b) => {
      const byRank = rank(a.row, query.today) - rank(b.row, query.today);
      if (byRank !== 0) return byRank;
      if (a.row.startDate !== b.row.startDate) return a.row.startDate < b.row.startDate ? -1 : 1;
      return a.row.title.localeCompare(b.row.title);
    });

  return {
    from: query.from,
    to: query.to,
    today: query.today,
    dates,
    truncated: matched.length > limit,
    totalMatched: matched.length,
    counts,
    facets: {
      destinations: [...facetDestinations].sort((a, b) => a.localeCompare(b)),
      guides: [...facetGuides].sort((a, b) => a.localeCompare(b)),
      transports: [...facetTransports].sort((a, b) => a.localeCompare(b)),
    },
    departures: matched.slice(0, limit).map((item) => item.row),
  };
}
