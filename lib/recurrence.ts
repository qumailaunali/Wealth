/**
 * Recurrence math. Occurrences are anchored to `startAt` (occurrence k = startAt + k·interval·unit)
 * so monthly rules on the 31st don't drift to the 28th after February.
 */
import { tz } from "@date-fns/tz";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export function nthOccurrence(
  startAt: Date,
  frequency: Frequency,
  interval: number,
  n: number,
  zone: string,
): Date {
  const ctx = { in: tz(zone) };
  const steps = n * interval;
  const d =
    frequency === "DAILY"
      ? addDays(startAt, steps, ctx)
      : frequency === "WEEKLY"
        ? addWeeks(startAt, steps, ctx)
        : frequency === "MONTHLY"
          ? addMonths(startAt, steps, ctx)
          : addYears(startAt, steps, ctx);
  return new Date(d.getTime());
}

export interface RuleTiming {
  startAt: Date;
  frequency: Frequency;
  interval: number;
  nextRunAt: Date;
  endsAt: Date | null;
}

/** Hard cap so a very old daily rule can't generate an unbounded batch in one request. */
export const MAX_OCCURRENCES_PER_RUN = 366;

/**
 * Returns the occurrences due in [rule.nextRunAt, now] and the new nextRunAt
 * (null when the rule has ended).
 */
export function dueOccurrences(
  rule: RuleTiming,
  now: Date,
  zone: string,
): { dates: Date[]; nextRunAt: Date | null } {
  const dates: Date[] = [];
  const interval = Math.max(1, rule.interval);
  let n = 0;
  let current = nthOccurrence(rule.startAt, rule.frequency, interval, n, zone);
  // Skip occurrences already generated.
  while (current < rule.nextRunAt && n < 100_000) {
    n++;
    current = nthOccurrence(rule.startAt, rule.frequency, interval, n, zone);
  }
  while (current <= now && dates.length < MAX_OCCURRENCES_PER_RUN) {
    if (rule.endsAt && current > rule.endsAt) return { dates, nextRunAt: null };
    dates.push(current);
    n++;
    current = nthOccurrence(rule.startAt, rule.frequency, interval, n, zone);
  }
  if (rule.endsAt && current > rule.endsAt) return { dates, nextRunAt: null };
  return { dates, nextRunAt: current };
}
