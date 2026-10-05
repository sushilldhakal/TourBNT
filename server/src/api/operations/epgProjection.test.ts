import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addIsoDays, projectEpg, type EpgQuery, type EpgSourceTour } from './epgProjection';

const TODAY = '2026-10-07';

function query(overrides: Partial<EpgQuery> = {}): EpgQuery {
  return {
    from: '2026-10-05',
    to: '2026-10-12',
    today: TODAY,
    status: 'all',
    ...overrides,
  };
}

function day(index: number, destination: string, extras: { guide?: string; hotel?: string; transport?: string; vehicle?: string; title?: string } = {}) {
  return {
    id: `day-${index + 1}`,
    day: `Day ${index + 1}`,
    title: extras.title ?? destination,
    destination,
    // A template date must not place the cell — only the departure start does.
    date: '2020-01-01',
    partners: [
      ...(extras.hotel ? [{ role: 'accommodation', name: extras.hotel }] : []),
      ...(extras.guide ? [{ role: 'guide', name: extras.guide }] : []),
      ...(extras.transport ? [{ role: 'transport', name: extras.transport, ...(extras.vehicle ? { unitType: extras.vehicle } : {}) }] : []),
    ],
  };
}

function tour(overrides: Partial<EpgSourceTour> & Pick<EpgSourceTour, 'id' | 'title' | 'itinerary' | 'tourDates'>): EpgSourceTour {
  return {
    code: overrides.code ?? overrides.id.toUpperCase(),
    tourStatus: 'Published',
    maxSize: 12,
    destination: null,
    ...overrides,
  };
}

describe('projectEpg', () => {
  it('gives each departure its own day number on the same calendar date', () => {
    const everest = tour({
      id: 'everest',
      title: 'Everest Base Camp',
      code: 'EBC-104',
      itinerary: [
        day(0, 'Kathmandu', { hotel: 'Hotel Yak', transport: 'Airport Shuttle', vehicle: 'Van', guide: 'Ram' }),
        day(1, 'Lukla', { transport: 'Summit Air', vehicle: 'Flight', guide: 'Ram', title: 'Fly to Lukla' }),
        day(2, 'Namche', { hotel: 'Namche Lodge', guide: 'Ram', title: 'Trek to Namche' }),
      ],
      tourDates: {
        scheduleType: 'multiple',
        days: 3,
        departures: [
          { id: '104', label: 'Group 104', dateRange: { from: '2026-10-05', to: '2026-10-07' }, capacity: 12 },
          { id: '109', label: 'Group 109', dateRange: { from: '2026-10-07', to: '2026-10-09' }, capacity: 10 },
        ],
      },
    });
    const annapurna = tour({
      id: 'annapurna',
      title: 'Annapurna',
      code: 'ANN-201',
      itinerary: [day(0, 'Pokhara', { hotel: 'Lakeside', guide: 'Sita', transport: 'Tourist Bus' })],
      tourDates: {
        scheduleType: 'fixed',
        defaultDateRange: { from: '2026-10-07', to: '2026-10-07' },
      },
    });

    const epg = projectEpg({ tours: [everest, annapurna], bookings: [], requests: [], query: query() });
    const byId = Object.fromEntries(epg.departures.map((row) => [row.id, row]));

    const group104 = byId['everest:104:2026-10-05'];
    const group109 = byId['everest:109:2026-10-07'];
    const anna = byId['annapurna:fixed:2026-10-07'];

    assert.equal(group104.days.find((cell) => cell.date === '2026-10-07')?.dayNumber, 3);
    assert.equal(group104.days.find((cell) => cell.date === '2026-10-07')?.destination, 'Namche');
    assert.equal(group104.currentDay, 3);
    assert.equal(group104.status, 'running');
    assert.equal(group104.todayStop?.accommodation, 'Namche Lodge');
    assert.equal(group104.todayStop?.guide, 'Ram');
    assert.equal(group104.todayStop?.transportKind, 'trek');
    assert.equal(group104.days.find((cell) => cell.date === '2026-10-06')?.transportKind, 'flight');

    assert.equal(group109.days.find((cell) => cell.date === '2026-10-07')?.dayNumber, 1);
    assert.equal(group109.days.find((cell) => cell.date === '2026-10-07')?.destination, 'Kathmandu');
    assert.equal(anna.days.find((cell) => cell.date === '2026-10-07')?.dayNumber, 1);
    assert.equal(anna.todayStop?.destination, 'Pokhara');
    assert.equal(anna.todayStop?.guide, 'Sita');

    assert.deepEqual(epg.dates, [
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
      '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12',
    ]);
  });

  it('does not invent a row for a flexible tour until someone books a departure', () => {
    const flexible = tour({
      id: 'flex',
      title: 'Flexible Valley',
      itinerary: [day(0, 'Kathmandu'), day(1, 'Bhaktapur')],
      tourDates: { scheduleType: 'flexible', days: 2, defaultDateRange: { from: '2026-10-01', to: '2026-12-01' } },
    });

    const empty = projectEpg({ tours: [flexible], bookings: [], requests: [], query: query() });
    assert.equal(empty.departures.length, 0);

    const booked = projectEpg({
      tours: [flexible],
      bookings: [{ tourId: 'flex', departureDate: '2026-10-07T09:00:00.000Z', status: 'confirmed', bookings: 2, pax: 5 }],
      requests: [],
      query: query(),
    });
    assert.equal(booked.departures.length, 1);
    assert.equal(booked.departures[0].startDate, '2026-10-07');
    assert.equal(booked.departures[0].days.find((cell) => cell.date === '2026-10-08')?.dayNumber, 2);
    assert.equal(booked.departures[0].guestCount, 5);
    assert.equal(booked.departures[0].departureLabel, 'Booked departure');
  });

  it('counts guests from live bookings and marks a departure cancelled only when every booking is cancelled', () => {
    const fixed = tour({
      id: 't',
      title: 'City Walk',
      itinerary: [day(0, 'Kathmandu')],
      tourDates: { scheduleType: 'fixed', defaultDateRange: { from: '2026-10-07', to: '2026-10-07' } },
    });
    const epg = projectEpg({
      tours: [fixed],
      bookings: [
        { tourId: 't', departureDate: '2026-10-07', status: 'confirmed', bookings: 1, pax: 2 },
        { tourId: 't', departureDate: '2026-10-07', status: 'pending', bookings: 1, pax: 1 },
        { tourId: 't', departureDate: '2026-10-07', status: 'cancelled', bookings: 4, pax: 9 },
      ],
      requests: [],
      query: query(),
    });
    assert.equal(epg.departures[0].guestCount, 3);
    assert.equal(epg.departures[0].bookingCount, 2);
    assert.equal(epg.departures[0].cancelled, false);

    const cancelled = projectEpg({
      tours: [fixed],
      bookings: [{ tourId: 't', departureDate: '2026-10-07', status: 'cancelled', bookings: 1, pax: 2 }],
      requests: [],
      query: query(),
    });
    assert.equal(cancelled.departures[0].status, 'cancelled');
    assert.equal(cancelled.departures[0].guestCount, 0);
    assert.equal(cancelled.counts.running, 0);
    assert.equal(cancelled.counts.cancelled, 1);
  });

  it('reuses supplier request status for attention and delay, scoped to that departure', () => {
    const packed = tour({
      id: 't',
      title: 'Everest Base Camp',
      itinerary: [day(0, 'Kathmandu'), day(1, 'Lukla'), day(2, 'Namche', { guide: 'Ram' })],
      tourDates: {
        scheduleType: 'multiple',
        departures: [
          { id: '104', label: '104', dateRange: { from: '2026-10-05', to: '2026-10-07' } },
          { id: '109', label: '109', dateRange: { from: '2026-10-08', to: '2026-10-10' } },
        ],
      },
    });
    const epg = projectEpg({
      tours: [packed],
      bookings: [],
      requests: [
        { tourId: 't', status: 'declined', role: 'accommodation', serviceDate: '2026-10-07', sourceDepartureDate: '2026-10-05T00:00:00.000Z', counterDate: null, partnerName: 'Namche Lodge' },
        { tourId: 't', status: 'countered', role: 'transport', serviceDate: '2026-10-08', sourceDepartureDate: '2026-10-08', counterDate: '2026-10-09', partnerName: 'Summit Air' },
      ],
      query: query({ to: '2026-10-14' }),
    });
    const running = epg.departures.find((row) => row.startDate === '2026-10-05');
    const later = epg.departures.find((row) => row.startDate === '2026-10-08');
    assert.equal(running?.status, 'attention');
    assert.equal(running?.needsAttention, true);
    assert.equal(running?.issues[0], 'Hotel declined: Namche Lodge');
    assert.equal(later?.status, 'delayed');
    assert.equal(later?.delayed, true);
    assert.equal(epg.counts.running, 1);
    assert.equal(epg.counts.attention, 1);
    assert.equal(epg.counts.upcoming, 1);

    const attentionOnly = projectEpg({
      tours: [packed],
      bookings: [],
      requests: [
        { tourId: 't', status: 'declined', role: 'guide', serviceDate: '2026-10-07', sourceDepartureDate: '2026-10-05', counterDate: null, partnerName: 'Ram' },
      ],
      query: query({ status: 'attention' }),
    });
    assert.deepEqual(attentionOnly.departures.map((row) => row.startDate), ['2026-10-05']);
  });

  it('expands a recurring departure into separate rows inside the window', () => {
    const weekly = tour({
      id: 't',
      title: 'Weekend City',
      itinerary: [day(0, 'Kathmandu'), day(1, 'Patan')],
      tourDates: {
        scheduleType: 'multiple',
        departures: [{
          id: 'wk',
          label: 'Saturday',
          dateRange: { from: '2026-10-03', to: '2026-10-04' },
          isRecurring: true,
          recurrencePattern: 'weekly',
          recurrenceInterval: 1,
          recurrenceEndDate: '2026-10-17',
        }],
      },
    });
    const epg = projectEpg({
      tours: [weekly],
      bookings: [],
      requests: [],
      query: query({ from: '2026-10-05', to: '2026-10-18' }),
    });
    assert.deepEqual(epg.departures.map((row) => row.startDate), ['2026-10-10', '2026-10-17']);
    assert.equal(epg.departures[0].endDate, '2026-10-11');
    assert.equal(addIsoDays('2026-10-03', 7), '2026-10-10');
  });

  it('filters by guide, destination, and transport without dropping unrelated facet options', () => {
    const a = tour({
      id: 'a',
      title: 'Everest',
      destination: 'Khumbu',
      itinerary: [day(0, 'Namche', { guide: 'Ram', transport: 'Summit Air' })],
      tourDates: { scheduleType: 'fixed', defaultDateRange: { from: '2026-10-07', to: '2026-10-07' } },
    });
    const b = tour({
      id: 'b',
      title: 'Chitwan',
      destination: 'Chitwan',
      itinerary: [day(0, 'Sauraha', { guide: 'Hari', transport: 'Terai Coach' })],
      tourDates: { scheduleType: 'fixed', defaultDateRange: { from: '2026-10-07', to: '2026-10-07' } },
    });
    const epg = projectEpg({
      tours: [a, b],
      bookings: [],
      requests: [],
      query: query({ guide: 'Ram' }),
    });
    assert.deepEqual(epg.departures.map((row) => row.title), ['Everest']);
    assert.deepEqual(epg.facets.guides, ['Hari', 'Ram']);
    assert.deepEqual(epg.facets.destinations, ['Chitwan', 'Khumbu', 'Namche', 'Sauraha']);
    assert.ok(epg.facets.transports.includes('Terai Coach'));

    const byPlace = projectEpg({
      tours: [a, b],
      bookings: [],
      requests: [],
      query: query({ destination: 'Sauraha', transport: 'Terai Coach', q: 'chit' }),
    });
    assert.deepEqual(byPlace.departures.map((row) => row.code), ['B']);
  });

  it('reports starting today and ending today from each departure, not from a shared day number', () => {
    const ending = tour({
      id: 'end',
      title: 'Ending',
      itinerary: [day(0, 'A'), day(1, 'B')],
      tourDates: { scheduleType: 'fixed', defaultDateRange: { from: '2026-10-06', to: '2026-10-07' } },
    });
    const starting = tour({
      id: 'start',
      title: 'Starting',
      itinerary: [day(0, 'C'), day(1, 'D')],
      tourDates: { scheduleType: 'fixed', defaultDateRange: { from: '2026-10-07', to: '2026-10-08' } },
    });
    const epg = projectEpg({ tours: [ending, starting], bookings: [], requests: [], query: query() });
    assert.equal(epg.counts['ending-today'], 1);
    assert.equal(epg.counts['starting-today'], 1);
    const endingRow = epg.departures.find((row) => row.tourId === 'end');
    assert.equal(endingRow?.currentDay, 2);
    assert.equal(endingRow?.totalDays, 2);
    assert.equal(endingRow?.nextStop, null);
  });

  it('keeps a completed departure out of the running set', () => {
    const done = tour({
      id: 'done',
      title: 'Finished',
      itinerary: [day(0, 'Kathmandu')],
      tourDates: { scheduleType: 'fixed', defaultDateRange: { from: '2026-10-01', to: '2026-10-01' } },
    });
    const epg = projectEpg({
      tours: [done],
      bookings: [],
      requests: [],
      query: query({ from: '2026-09-30', to: '2026-10-08', status: 'completed' }),
    });
    assert.equal(epg.departures[0].status, 'completed');
    assert.equal(epg.departures[0].currentDay, null);
  });
});
