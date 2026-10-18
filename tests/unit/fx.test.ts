import { describe, expect, it } from "vitest";
import { convertTotals } from "@/lib/fx";

describe("convertTotals", () => {
  it("passes the default currency through untouched", () => {
    const r = convertTotals({ PKR: 150_000 }, {}, "PKR");
    expect(r.total).toBe(150_000);
    expect(r.parts).toEqual([{ currency: "PKR", original: 150_000, converted: 150_000, rate: 1 }]);
    expect(r.unconverted).toEqual({});
  });

  it("converts a USD balance into PKR", () => {
    // $500.00 (50,000 cents) at 280 → Rs 140,000.00 (14,000,000 paisa)
    const r = convertTotals({ PKR: 100_000, USD: 50_000 }, { USD: 280 }, "PKR");
    expect(r.total).toBe(100_000 + 14_000_000);
    expect(r.parts).toContainEqual({
      currency: "USD",
      original: 50_000,
      converted: 14_000_000,
      rate: 280,
    });
    expect(r.unconverted).toEqual({});
  });

  it("rounds once per currency", () => {
    // $0.01 at 278.55 → 278.55 paisa → 279
    const r = convertTotals({ USD: 1 }, { USD: 278.55 }, "PKR");
    expect(r.total).toBe(279);
  });

  it("leaves currencies without a rate unconverted", () => {
    const r = convertTotals({ PKR: 100_000, EUR: 20_000 }, { USD: 280 }, "PKR");
    expect(r.total).toBe(100_000);
    expect(r.unconverted).toEqual({ EUR: 20_000 });
    expect(r.parts.every((p) => p.currency !== "EUR")).toBe(true);
  });

  it("treats zero, negative and non-finite rates as missing", () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = convertTotals({ USD: 1_000 }, { USD: bad }, "PKR");
      expect(r.total).toBe(0);
      expect(r.unconverted).toEqual({ USD: 1_000 });
    }
  });

  it("handles a non-default base currency", () => {
    // Rs 1,000.00 (100,000 paisa) at 0.0036 USD/PKR → $3.60 (360 cents)
    const r = convertTotals({ USD: 50_000, PKR: 100_000 }, { PKR: 0.0036 }, "USD");
    expect(r.total).toBe(50_000 + 360);
  });
});
