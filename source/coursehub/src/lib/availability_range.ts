// Date-range logic for the Quick select card on the staff Appointments page.
// Pure functions (no React), dates are "YYYY-MM-DD" keys like everywhere else on the page.

import type { AppointmentSlot } from "@/lib/appointments";

export const MAX_RANGE_DAYS = 120; // a bulk change makes one request per date, so keep it bounded
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DAY_MS = 24 * 60 * 60 * 1000;

const toUTC = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

// 0 = Sunday ... 6 = Saturday (same order as the calendar)
export const weekdayOf = (key: string) => new Date(toUTC(key)).getUTCDay();

export const rangeLength = (start: string, end: string) => Math.round((toUTC(end) - toUTC(start)) / DAY_MS) + 1;

export function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let t = toUTC(start); t <= toUTC(end); t += DAY_MS) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
}

export type RangePlan =
  | { error: string }
  | {
      error: null;
      toCreate: string[]; // dates with no slot yet -> "mark available" creates one slot each
      alreadyAvailable: number; // chosen dates that already have slots (skipped when marking available)
      toRemove: AppointmentSlot[]; // every slot on the chosen dates -> "mark unavailable" deletes them
      bookings: number; // student bookings those slots hold (they are cancelled with the slots)
      pastSkipped: number; // chosen dates before today, which are never changed
    };

// Works out what a bulk change would do. `days[0..6]` = which weekdays (Sun..Sat) are included.
export function buildRangePlan(
  start: string,
  end: string,
  days: boolean[],
  slots: AppointmentSlot[],
  todayKey: string,
): RangePlan {
  if (!DATE_PATTERN.test(start) || !DATE_PATTERN.test(end)) return { error: "Pick a start and end date." };
  if (end < start) return { error: "The end date must be on or after the start date." };
  if (rangeLength(start, end) > MAX_RANGE_DAYS) return { error: `Pick a range of at most ${MAX_RANGE_DAYS} days.` };

  const byDate = new Map<string, AppointmentSlot[]>();
  for (const s of slots) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);

  const toCreate: string[] = [];
  const toRemove: AppointmentSlot[] = [];
  let alreadyAvailable = 0;
  let pastSkipped = 0;
  for (const date of datesInRange(start, end)) {
    if (!days[weekdayOf(date)]) continue;
    if (todayKey && date < todayKey) {
      pastSkipped++;
      continue;
    }
    const daySlots = byDate.get(date) ?? [];
    if (daySlots.length > 0) {
      alreadyAvailable++;
      toRemove.push(...daySlots);
    } else {
      toCreate.push(date);
    }
  }
  return {
    error: null,
    toCreate,
    alreadyAvailable,
    toRemove,
    bookings: toRemove.reduce((sum, s) => sum + s.booked, 0),
    pastSkipped,
  };
}
