import { describe, expect, it } from "vitest";
import {
  bigToMinor,
  currencyDecimals,
  formatMoney,
  parseMoney,
  percentChange,
  sumMinor,
  toInputString,
} from "@/lib/money";

describe("currencyDecimals", () => {
  it("knows common currencies", () => {
    expect(currencyDecimals("PKR")).toBe(2);
    expect(currencyDecimals("JPY")).toBe(0);
    expect(currencyDecimals("KWD")).toBe(3);
  });
});

describe("parseMoney", () => {
  it("parses whole and fractional amounts into minor units", () => {
    expect(parseMoney("1234", "PKR")).toBe(123400);
    expect(parseMoney("1,234.5", "PKR")).toBe(123450);
    expect(parseMoney("0.07", "USD")).toBe(7);
    expect(parseMoney(".5", "USD")).toBe(50);
    expect(parseMoney("12.", "USD")).toBe(1200);
    expect(parseMoney("-250.75", "PKR")).toBe(-25075);
  });

  it("never introduces floating point error", () => {
    // 0.1 + 0.2 style inputs stay exact
    expect(parseMoney("0.29", "USD")).toBe(29);
    expect(parseMoney("1.15", "USD")).toBe(115);
    expect(parseMoney("4.35", "USD")).toBe(435);
  });

  it("respects the currency's precision", () => {
    expect(parseMoney("10.5", "JPY")).toBeNull();
    expect(parseMoney("1.234", "PKR")).toBeNull();
    expect(parseMoney("1.234", "KWD")).toBe(1234);
  });

  it("rejects garbage and oversized input", () => {
    expect(parseMoney("", "PKR")).toBeNull();
    expect(parseMoney("abc", "PKR")).toBeNull();
    expect(parseMoney("1.2.3", "PKR")).toBeNull();
    expect(parseMoney(".", "PKR")).toBeNull();
    expect(parseMoney("12345678901234", "PKR")).toBeNull();
  });
});

describe("toInputString", () => {
  it("round-trips with parseMoney", () => {
    for (const v of [0, 1, 99, 100, 123450, 123456, -500]) {
      expect(parseMoney(toInputString(v, "PKR"), "PKR")).toBe(v);
    }
    expect(toInputString(123450, "PKR")).toBe("1234.5");
    expect(toInputString(5, "USD")).toBe("0.05");
    expect(toInputString(1500, "JPY")).toBe("1500");
  });
});

describe("formatMoney", () => {
  it("formats with grouping and trims whole amounts", () => {
    expect(formatMoney(123400, "USD", { locale: "en-US" })).toBe("$1,234");
    expect(formatMoney(123450, "USD", { locale: "en-US" })).toBe("$1,234.50");
  });

  it("supports lakh grouping and signs", () => {
    expect(formatMoney(1234567_00, "INR", { locale: "en-IN" })).toBe("₹12,34,567");
    expect(formatMoney(5000, "USD", { locale: "en-US", sign: "always" })).toBe("+$50");
    expect(formatMoney(-5000, "USD", { locale: "en-US" })).toBe("-$50");
  });

  it("formats compact amounts", () => {
    expect(formatMoney(1_500_000_00, "USD", { locale: "en-US", compact: true })).toBe("$1.5M");
  });
});

describe("helpers", () => {
  it("sums minor units exactly", () => {
    expect(sumMinor([10, 20, 30])).toBe(60);
    expect(sumMinor([])).toBe(0);
  });

  it("converts bigint safely", () => {
    expect(bigToMinor(123n)).toBe(123);
    expect(bigToMinor(null)).toBe(0);
    expect(() => bigToMinor(2n ** 60n)).toThrow(RangeError);
  });

  it("computes percent change", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
  });
});
