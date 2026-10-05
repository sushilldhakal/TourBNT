import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addDays, dayIndexOf, expandOpenSlotDates, toDateString } from './openSlotDates';

describe('expandOpenSlotDates', () => {
  const itinerary = [{ id: 'd0' }, { id: 'd1' }, { id: 'd2' }];

  it('places each departure on the calendar day for that itinerary index', () => {
    const dates = expandOpenSlotDates(
      {
        scheduleType: 'multiple',
        departures: [
          { dateRange: { from: '2026-10-05T00:00:00.000Z' }, capacity: 8 },
          { dateRange: { from: '2026-10-07T00:00:00.000Z' }, capacity: 4 },
        ],
      },
      dayIndexOf(itinerary, 'd2'),
      '2026-10-01',
      12,
    );
    assert.deepEqual(dates.map((d) => d.serviceDate), ['2026-10-07', '2026-10-09']);
    assert.deepEqual(dates.map((d) => d.headcount), [8, 4]);
  });

  it('uses the single fixed range and skips dates before today', () => {
    const start = new Date('2026-10-01T00:00:00.000Z');
    const dates = expandOpenSlotDates(
      { scheduleType: 'fixed', defaultDateRange: { from: start } },
      0,
      '2026-10-05',
      10,
    );
    assert.deepEqual(dates, []);
  });

  it('does not invent dates for a flexible schedule', () => {
    const dates = expandOpenSlotDates({ scheduleType: 'flexible' }, 1, '2026-10-01', 10);
    assert.deepEqual(dates, []);
  });

  it('adds days in UTC so a date does not slip', () => {
    const start = new Date('2026-10-05T00:00:00.000Z');
    assert.equal(toDateString(addDays(start, 2)), '2026-10-07');
  });
});
