/**
 * Calendar dates an open itinerary slot can be applied for.
 * Same rule as itinerary request generation: service date is the departure
 * start plus the day's index in the itinerary. Flexible and recurring
 * schedules have no fixed start, so they produce no open dates.
 */

export interface OpenSlotTourDates {
  scheduleType?: string;
  defaultDateRange?: { from?: string | Date | null } | null;
  departures?: Array<{ dateRange?: { from?: string | Date | null } | null; capacity?: number | null } | null> | null;
}

export interface OpenSlotDate {
  serviceDate: string;
  /** Departure start, kept as a Date so a created request stores the same instant as other fixed-departure requests. */
  sourceDeparture: Date;
  headcount: number;
}

export const toDateString = (d: Date): string => d.toISOString().slice(0, 10);

export const addDays = (d: Date, days: number): Date => {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

export function dayIndexOf(itinerary: unknown, dayId: string): number {
  if (!Array.isArray(itinerary)) return -1;
  return itinerary.findIndex((day) => !!day && typeof day === 'object' && (day as { id?: string }).id === dayId);
}

export function dayLabelOf(itinerary: unknown, dayId: string): string {
  if (!Array.isArray(itinerary)) return '';
  const day = itinerary.find((item) => !!item && typeof item === 'object' && (item as { id?: string }).id === dayId) as { day?: string; title?: string } | undefined;
  if (!day) return '';
  return [day.day, day.title].filter(Boolean).join(' — ');
}

export function serviceWindowOf(itinerary: unknown, dayId: string, role: string): { time?: string; endTime?: string } {
  if (!Array.isArray(itinerary)) return {};
  const day = itinerary.find((item) => !!item && typeof item === 'object' && (item as { id?: string }).id === dayId) as { partners?: Array<{ role?: string; time?: string; endTime?: string }> } | undefined;
  const partner = day?.partners?.find((p) => p?.role === role);
  return { time: partner?.time || undefined, endTime: partner?.endTime || undefined };
}

export function expandOpenSlotDates(
  tourDates: OpenSlotTourDates | null | undefined,
  dayIndex: number,
  today: string,
  maxSize: number | null | undefined,
  limit = 40,
): OpenSlotDate[] {
  if (!tourDates || dayIndex < 0) return [];

  const starts: Array<{ start: Date; capacity?: number }> = [];
  if (tourDates.scheduleType === 'multiple') {
    for (const departure of tourDates.departures ?? []) {
      if (!departure?.dateRange?.from) continue;
      const start = new Date(departure.dateRange.from);
      starts.push({ start, capacity: typeof departure.capacity === 'number' ? departure.capacity : undefined });
    }
  } else if (tourDates.scheduleType === 'fixed' && tourDates.defaultDateRange?.from) {
    starts.push({ start: new Date(tourDates.defaultDateRange.from) });
  }

  const out: OpenSlotDate[] = [];
  for (const dep of starts) {
    if (Number.isNaN(dep.start.getTime())) continue;
    const serviceDate = toDateString(addDays(dep.start, dayIndex));
    if (serviceDate < today) continue;
    out.push({
      serviceDate,
      sourceDeparture: dep.start,
      headcount: dep.capacity ?? maxSize ?? 0,
    });
    if (out.length >= limit) break;
  }
  return out;
}
