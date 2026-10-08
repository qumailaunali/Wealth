/**
 * Timezone-aware date helpers. Timestamps are stored in UTC; all calendar math
 * (day/week/month boundaries, grouping) happens in the user's timezone.
 */
import { tz } from "@date-fns/tz";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  format,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";

export const DEFAULT_TZ = "Asia/Karachi";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** yyyy-MM-dd key for the calendar day of `date` in `zone`. */
export function dayKey(date: Date, zone: string): string {
  return format(date, "yyyy-MM-dd", { in: tz(zone) });
}

export function startOfDayTz(date: Date, zone: string): Date {
  return new Date(startOfDay(date, { in: tz(zone) }).getTime());
}

export function endOfDayTz(date: Date, zone: string): Date {
  return new Date(endOfDay(date, { in: tz(zone) }).getTime());
}

export function monthRange(date: Date, zone: string): { from: Date; to: Date } {
  const from = startOfMonth(date, { in: tz(zone) });
  return { from: new Date(from.getTime()), to: new Date(addMonths(from, 1).getTime()) };
}

/** Parse "yyyy-MM-dd" as a calendar day in `zone`. */
export function parseDayInTz(value: string, zone: string): Date | null {
  const d = parse(value, "yyyy-MM-dd", new Date(), { in: tz(zone) });
  return isValid(d) ? new Date(d.getTime()) : null;
}

/** "yyyy-MM-ddTHH:mm" (datetime-local input) interpreted in `zone` → UTC Date. */
export function parseLocalDateTime(value: string, zone: string): Date | null {
  const d = parse(value, "yyyy-MM-dd'T'HH:mm", new Date(), { in: tz(zone) });
  return isValid(d) ? new Date(d.getTime()) : null;
}

/** UTC Date → "yyyy-MM-ddTHH:mm" in `zone` (for datetime-local inputs). */
export function toLocalDateTimeInput(date: Date, zone: string): string {
  return format(date, "yyyy-MM-dd'T'HH:mm", { in: tz(zone) });
}

export function formatInTz(date: Date, pattern: string, zone: string): string {
  return format(date, pattern, { in: tz(zone) });
}

/** Human label for a day group: Today / Yesterday / Mon, 6 Oct. */
export function dayLabel(key: string, zone: string, now = new Date()): string {
  const today = dayKey(now, zone);
  const yesterday = dayKey(addDays(now, -1), zone);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  const d = parse(key, "yyyy-MM-dd", new Date());
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return format(d, sameYear ? "EEE, d MMM" : "EEE, d MMM yyyy");
}

export const PERIODS = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "3-months", label: "3 months" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

export interface DateRange {
  from: Date;
  /** exclusive */
  to: Date;
}

export function resolvePeriod(
  period: Period,
  zone: string,
  weekStart: Weekday,
  custom?: { from?: string; to?: string },
  now = new Date(),
): DateRange {
  const ctx = { in: tz(zone) };
  const toDate = (d: Date) => new Date(d.getTime());
  switch (period) {
    case "week": {
      const from = startOfWeek(now, { ...ctx, weekStartsOn: weekStart });
      return { from: toDate(from), to: toDate(addDays(from, 7)) };
    }
    case "last-month": {
      const from = startOfMonth(subMonths(now, 1, ctx), ctx);
      return { from: toDate(from), to: toDate(addMonths(from, 1)) };
    }
    case "3-months": {
      const from = startOfMonth(subMonths(now, 2, ctx), ctx);
      return { from: toDate(from), to: toDate(addMonths(startOfMonth(now, ctx), 1)) };
    }
    case "year": {
      const from = startOfYear(now, ctx);
      return { from: toDate(from), to: toDate(addMonths(from, 12)) };
    }
    case "custom": {
      const from = custom?.from ? parseDayInTz(custom.from, zone) : null;
      const to = custom?.to ? parseDayInTz(custom.to, zone) : null;
      if (from && to && from <= to) return { from, to: toDate(addDays(to, 1)) };
      return monthRange(now, zone);
    }
    case "month":
    default:
      return monthRange(now, zone);
  }
}

/** Number of calendar days in range that have elapsed (for average daily spend). */
export function elapsedDays(range: DateRange, zone: string, now = new Date()): number {
  const end = now < range.to ? now : new Date(range.to.getTime() - 1);
  if (end < range.from) return 1;
  return Math.max(1, differenceInCalendarDays(end, range.from, { in: tz(zone) }) + 1);
}

/** Enumerate yyyy-MM-dd keys in [from, to). */
export function eachDayKey(range: DateRange, zone: string): string[] {
  const keys: string[] = [];
  let cursor = startOfDay(range.from, { in: tz(zone) });
  while (cursor.getTime() < range.to.getTime()) {
    keys.push(format(cursor, "yyyy-MM-dd", { in: tz(zone) }));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export function greeting(zone: string, now = new Date()): string {
  const hour = Number(format(now, "H", { in: tz(zone) }));
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
