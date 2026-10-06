/**
 * Partner scope of the operations timeline: what a hotel, guesthouse,
 * restaurant, guide or transport business has been asked to do, day by day.
 *
 * It is the same projection as the operator view (departure x calendar date,
 * day N = start + N - 1) narrowed to the departures where the caller's own
 * businesses have a supplier request, with those requests attached to the
 * day they fall on. Nothing is stored.
 *
 * A partner must not learn who else is on a trip, so the itinerary's partner
 * lines (other hotels, guides, vehicles) are stripped before projecting. That
 * also keeps them out of search and facets.
 */
import {
  parseIsoDate,
  projectEpg,
  type EpgBookingAgg,
  type EpgDeparture,
  type EpgPartnerService,
  type EpgProjection,
  type EpgQuery,
  type EpgSourceTour,
} from './epgProjection';

export interface EpgPartnerRequest {
  id: string;
  tourId: string;
  partnerId: string;
  partnerName: string;
  role: string;
  status: string;
  serviceDate: string;
  serviceTime: string | null;
  serviceEndTime: string | null;
  headcount: number;
  unitsRequested: number;
  capacityConfirmed: number | null;
  unitType: string | null;
  sourceDepartureDate: string | null;
  counterDate: string | null;
}

function stripItineraryPartners(itinerary: unknown): unknown {
  if (!Array.isArray(itinerary)) return itinerary;
  return itinerary.map((day) =>
    day && typeof day === 'object' && !Array.isArray(day) ? { ...(day as Record<string, unknown>), partners: [] } : day,
  );
}

interface NormalizedRequest extends EpgPartnerRequest {
  serviceDate: string;
}

/** Same rule projectEpg uses to link a supplier request to a departure. */
function linkedTo(request: NormalizedRequest, row: Pick<EpgDeparture, 'tourId' | 'startDate' | 'endDate'>): boolean {
  if (request.tourId !== row.tourId) return false;
  if (request.sourceDepartureDate) return parseIsoDate(request.sourceDepartureDate) === row.startDate;
  return request.serviceDate >= row.startDate && request.serviceDate <= row.endDate;
}

function toService(request: NormalizedRequest): EpgPartnerService {
  return {
    requestId: request.id,
    partnerId: request.partnerId,
    partnerName: request.partnerName,
    role: request.role,
    status: request.status,
    serviceTime: request.serviceTime,
    serviceEndTime: request.serviceEndTime,
    headcount: request.headcount,
    unitsRequested: request.unitsRequested,
    capacityConfirmed: request.capacityConfirmed,
    unitType: request.unitType,
    counterDate: request.counterDate ? parseIsoDate(request.counterDate) : null,
  };
}

export function projectPartnerEpg(input: {
  tours: EpgSourceTour[];
  bookings: EpgBookingAgg[];
  requests: EpgPartnerRequest[];
  query: EpgQuery;
}): EpgProjection {
  const requests: NormalizedRequest[] = [];
  for (const request of input.requests) {
    const serviceDate = parseIsoDate(request.serviceDate);
    if (serviceDate) requests.push({ ...request, serviceDate });
  }
  const ownTourIds = new Set(requests.map((request) => request.tourId));

  const projection = projectEpg({
    tours: input.tours
      .filter((tour) => ownTourIds.has(tour.id))
      .map((tour) => ({ ...tour, itinerary: stripItineraryPartners(tour.itinerary) })),
    bookings: input.bookings,
    // Attention / delayed come only from this business's own requests.
    requests: requests.map((request) => ({
      tourId: request.tourId,
      status: request.status,
      role: request.role,
      serviceDate: request.serviceDate,
      sourceDepartureDate: request.sourceDepartureDate,
      counterDate: request.counterDate,
      partnerName: request.partnerName,
    })),
    query: input.query,
    include: (row) => requests.some((request) => linkedTo(request, row)),
  });

  for (const departure of projection.departures) {
    const mine = requests.filter((request) => linkedTo(request, departure));
    for (const day of departure.days) {
      const services = mine.filter((request) => request.serviceDate === day.date).map(toService);
      if (services.length > 0) day.services = services;
    }
    for (const stop of [departure.todayStop, departure.nextStop]) {
      if (!stop) continue;
      const services = mine.filter((request) => request.serviceDate === stop.date).map(toService);
      if (services.length > 0) stop.services = services;
    }
  }

  return { ...projection, scope: 'partner' };
}
