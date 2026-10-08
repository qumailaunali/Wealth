import { describe, expect, it } from "vitest";
import { dayKey, resolvePeriod } from "@/lib/dates";
import { applyKey, formatKeypadDisplay } from "@/lib/keypad";
import { dueOccurrences, nthOccurrence } from "@/lib/recurrence";

const TZ = "Asia/Karachi";

describe("recurrence", () => {
  it("anchors monthly rules to the start day (no drift after short months)", () => {
    const start = new Date("2026-01-31T05:00:00Z"); // 31 Jan, 10:00 PKT
    const days = [0, 1, 2, 3].map((n) => dayKey(nthOccurrence(start, "MONTHLY", 1, n, TZ), TZ));
    expect(days).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("returns every due occurrence and the next run", () => {
    const start = new Date("2026-03-01T05:00:00Z");
    const { dates, nextRunAt } = dueOccurrences(
      { startAt: start, frequency: "WEEKLY", interval: 1, nextRunAt: start, endsAt: null },
      new Date("2026-03-20T00:00:00Z"),
      TZ,
    );
    expect(dates.map((d) => dayKey(d, TZ))).toEqual(["2026-03-01", "2026-03-08", "2026-03-15"]);
    expect(nextRunAt && dayKey(nextRunAt, TZ)).toBe("2026-03-22");
  });

  it("skips already-generated occurrences and stops at endsAt", () => {
    const start = new Date("2026-01-01T05:00:00Z");
    const { dates, nextRunAt } = dueOccurrences(
      {
        startAt: start,
        frequency: "MONTHLY",
        interval: 1,
        nextRunAt: new Date("2026-03-01T05:00:00Z"),
        endsAt: new Date("2026-04-15T00:00:00Z"),
      },
      new Date("2026-08-01T00:00:00Z"),
      TZ,
    );
    expect(dates.map((d) => dayKey(d, TZ))).toEqual(["2026-03-01", "2026-04-01"]);
    expect(nextRunAt).toBeNull();
  });
});

describe("periods", () => {
  it("resolves month boundaries in the user's timezone", () => {
    // 30 Sep 2026 21:00 UTC is already 1 Oct in Karachi
    const range = resolvePeriod("month", TZ, 1, undefined, new Date("2026-09-30T21:00:00Z"));
    expect(range.from.toISOString()).toBe("2026-09-30T19:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-31T19:00:00.000Z");
  });
});

describe("keypad", () => {
  it("builds amounts digit by digit", () => {
    let v = "";
    for (const k of ["1", "2", "0", ".", "5", "0", "9"] as const) v = applyKey(v, k, 2);
    expect(v).toBe("120.50");
    expect(applyKey(v, "back", 2)).toBe("120.5");
    expect(applyKey("", ".", 2)).toBe("0.");
    expect(applyKey("0", "7", 2)).toBe("7");
    expect(applyKey("5", ".", 0)).toBe("5");
    expect(applyKey("12", "clear", 2)).toBe("");
  });

  it("formats with locale grouping while typing", () => {
    expect(formatKeypadDisplay("1234567.5", "en-US")).toBe("1,234,567.5");
    expect(formatKeypadDisplay("1234567", "en-IN")).toBe("12,34,567");
    expect(formatKeypadDisplay("12.", "de-DE")).toBe("12,");
    expect(formatKeypadDisplay("", "en-US")).toBe("0");
  });
});
