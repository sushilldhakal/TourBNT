'use client';

import dynamic from 'next/dynamic';

const calendarModule = () => import('@/components/ui/calendar');

if (typeof window !== 'undefined') {
  void calendarModule();
}

/** Lazy-loaded Calendar (react-day-picker ~17KB). Use in place of @/components/ui/calendar to code-split. */
export const Calendar = dynamic(
  () => calendarModule().then((m) => ({ default: m.Calendar })),
  { ssr: false }
);

export const CalendarDayButton = dynamic(
  () => calendarModule().then((m) => ({ default: m.CalendarDayButton })),
  { ssr: false }
);

export type { DateRange } from 'react-day-picker';
