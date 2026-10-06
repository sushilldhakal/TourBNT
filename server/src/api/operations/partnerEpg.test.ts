import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { projectPartnerEpg, type EpgPartnerRequest } from './partnerEpg';
import type { EpgQuery, EpgSourceTour } from './epgProjection';

const query = (overrides: Partial<EpgQuery> = {}): EpgQuery => ({
  from: '2026-10-05',
  to: '2026-10-12',
  today: '2026-10-07',
  status: 'all',
  ...overrides,
});

function tour(id: string, title: string, start: string, days: number, hotels: string[] = []): EpgSourceTour {
  return {
    id,
    title,
    code: id.toUpperCase(),
    tourStatus: 'Published',
    maxSize: 12,
    destination: null,
    tourDates: { scheduleType: 'fixed', defaultDateRange: { from: start } },
    itinerary: Array.from({ length: days }, (_, i) => ({
      id: `${id}-${i + 1}`,
      title: `${title} stop ${i + 1}`,
      destination: `Place ${i + 1}`,
      partners: [
        { role: 'accommodation', name: hotels[i] ?? 'Other Hotel' },
        { role: 'guide', name: 'Secret Guide' },
        { role: 'transport', name: 'Secret Bus', unitType: 'Coach' },
      ],
    })),
  };
}

function request(overrides: Partial<EpgPartnerRequest> & Pick<EpgPartnerRequest, 'id' | 'tourId' | 'serviceDate'>): EpgPartnerRequest {
  return {
    partnerId: 'p1',
    partnerName: 'Hotel Sherpa',
    role: 'accommodation',
    status: 'confirmed',
    serviceTime: null,
    serviceEndTime: null,
    headcount: 8,
    unitsRequested: 4,
    capacityConfirmed: 4,
    unitType: 'Twin room',
    sourceDepartureDate: null,
    counterDate: null,
    ...overrides,
  };
}

const TOURS = [tour('ebc', 'Everest Base Camp', '2026-10-05', 7), tour('acs', 'Annapurna Circuit', '2026-10-07', 5), tour('ktm', 'Kathmandu Valley', '2026-10-06', 3)];

describe('projectPartnerEpg', () => {
  it('only shows departures where the business has a request, with its services on the right days', () => {
    const result = projectPartnerEpg({
      tours: TOURS,
      bookings: [],
      requests: [
        request({ id: 'r1', tourId: 'ebc', serviceDate: '2026-10-07' }),
        request({ id: 'r2', tourId: 'ebc', serviceDate: '2026-10-08', headcount: 10 }),
        request({ id: 'r3', tourId: 'acs', serviceDate: '2026-10-09', role: 'meals', serviceTime: '19:00', unitType: 'Dinner' }),
      ],
      query: query(),
    });
    assert.equal(result.scope, 'partner');
    assert.deepEqual(result.departures.map((d) => d.tourId).sort(), ['acs', 'ebc']);
    const ebc = result.departures.find((d) => d.tourId === 'ebc')!;
    const withServices = ebc.days.filter((d) => d.services);
    assert.deepEqual(withServices.map((d) => [d.date, d.dayNumber, d.services![0].headcount]), [['2026-10-07', 3, 8], ['2026-10-08', 4, 10]]);
    const acs = result.departures.find((d) => d.tourId === 'acs')!;
    assert.equal(acs.days.find((d) => d.date === '2026-10-09')!.services![0].serviceTime, '19:00');
    assert.equal(result.counts.all, 2);
  });

  it('does not leak other suppliers via fields, facets or search', () => {
    const base = { tours: TOURS, bookings: [], requests: [request({ id: 'r1', tourId: 'ebc', serviceDate: '2026-10-07' })] };
    const result = projectPartnerEpg({ ...base, query: query() });
    for (const day of result.departures[0].days) {
      assert.equal(day.accommodation, null);
      assert.equal(day.guide, null);
      assert.equal(day.transport, null);
      assert.equal(day.vehicle, null);
    }
    assert.equal(result.departures[0].guideName, null);
    assert.deepEqual(result.facets.guides, []);
    assert.deepEqual(result.facets.transports, []);
    assert.equal(projectPartnerEpg({ ...base, query: query({ q: 'secret guide' }) }).departures.length, 0);
    assert.equal(projectPartnerEpg({ ...base, query: query({ guide: 'Secret Guide' }) }).departures.length, 0);
  });

  it('counts and status filters only see this business\'s departures', () => {
    const result = projectPartnerEpg({
      tours: TOURS,
      bookings: [],
      requests: [request({ id: 'r1', tourId: 'ebc', serviceDate: '2026-10-07' })],
      query: query({ status: 'upcoming' }),
    });
    assert.equal(result.departures.length, 0);
    assert.equal(result.counts.all, 1);
    assert.equal(result.counts.running, 1);
  });

  it('flags attention only from the business\'s own declined or countered requests', () => {
    const declined = projectPartnerEpg({
      tours: TOURS, bookings: [],
      requests: [request({ id: 'r1', tourId: 'ebc', serviceDate: '2026-10-07', status: 'declined' })],
      query: query(),
    });
    assert.equal(declined.departures[0].needsAttention, true);
    assert.equal(declined.departures[0].status, 'attention');
    const countered = projectPartnerEpg({
      tours: TOURS, bookings: [],
      requests: [request({ id: 'r1', tourId: 'ebc', serviceDate: '2026-10-07', status: 'countered', counterDate: '2026-10-08' })],
      query: query(),
    });
    assert.equal(countered.departures[0].delayed, true);
    assert.equal(countered.departures[0].days.find((d) => d.date === '2026-10-07')!.services![0].counterDate, '2026-10-08');
  });

  it('keeps fixed-departure requests on their own departure only', () => {
    const recurring: EpgSourceTour = {
      ...tour('rec', 'Weekly Valley', '2026-10-05', 3),
      tourDates: { scheduleType: 'recurring', isRecurring: true, recurrencePattern: 'weekly', recurrenceEndDate: '2026-10-19', defaultDateRange: { from: '2026-10-05' } },
    };
    const result = projectPartnerEpg({
      tours: [recurring], bookings: [],
      requests: [request({ id: 'r1', tourId: 'rec', serviceDate: '2026-10-13', sourceDepartureDate: '2026-10-12' })],
      query: query({ to: '2026-10-20' }),
    });
    assert.deepEqual(result.departures.map((d) => d.startDate), ['2026-10-12']);
  });

  it('returns an empty projection when the business has no requests', () => {
    const result = projectPartnerEpg({ tours: TOURS, bookings: [], requests: [], query: query() });
    assert.equal(result.departures.length, 0);
    assert.equal(result.scope, 'partner');
    assert.equal(result.dates.length, 8);
  });

  it('two businesses of one owner appear on the same departure as separate services', () => {
    const result = projectPartnerEpg({
      tours: TOURS, bookings: [],
      requests: [
        request({ id: 'r1', tourId: 'ebc', serviceDate: '2026-10-07' }),
        request({ id: 'r2', tourId: 'ebc', serviceDate: '2026-10-07', partnerId: 'p2', partnerName: 'Sherpa Kitchen', role: 'meals', serviceTime: '13:00' }),
      ],
      query: query(),
    });
    assert.equal(result.departures.length, 1);
    assert.deepEqual(result.departures[0].days.find((d) => d.date === '2026-10-07')!.services!.map((s) => s.partnerName), ['Hotel Sherpa', 'Sherpa Kitchen']);
  });
});
