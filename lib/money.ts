/**
 * Single source of truth for money handling.
 * Amounts are integers in the currency's smallest unit ("minor units", e.g. paisa).
 * Never use floats for arithmetic on money.
 */
import { CURRENCIES } from "./currencies";

export type Minor = number;

const decimalsCache = new Map<string, number>();

export function currencyDecimals(currency: string): number {
  const cached = decimalsCache.get(currency);
  if (cached !== undefined) return cached;
  let decimals = CURRENCIES.find((c) => c.code === currency)?.decimals;
  if (decimals === undefined) {
    try {
      decimals =
        new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
          .maximumFractionDigits ?? 2;
    } catch {
      decimals = 2;
    }
  }
  decimalsCache.set(currency, decimals);
  return decimals;
}

/** Largest amount we accept (major-unit digits) — keeps minor units inside Number.MAX_SAFE_INTEGER. */
export const MAX_MAJOR_DIGITS = 13;

/**
 * Parse a user-entered decimal string into minor units without floating point.
 * Accepts "1234", "1,234.5", "0.07", ".5". Returns null when invalid or too precise.
 */
export function parseMoney(input: string, currency: string): Minor | null {
  const decimals = currencyDecimals(currency);
  const cleaned = input.trim().replace(/[,\s_]/g, "");
  if (cleaned === "") return null;
  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const match = /^(\d*)(?:\.(\d*))?$/.exec(unsigned);
  if (!match) return null;
  const whole = match[1] ?? "";
  const frac = match[2] ?? "";
  if (whole === "" && frac === "") return null;
  if (frac.length > decimals) return null;
  if (whole.replace(/^0+/, "").length > MAX_MAJOR_DIGITS) return null;
  const value = Number.parseInt((whole || "0") + frac.padEnd(decimals, "0"), 10);
  if (!Number.isSafeInteger(value)) return null;
  return negative ? -value : value;
}

/** Minor units → plain decimal string for an input field (trailing zeros trimmed). */
export function toInputString(minor: Minor, currency: string): string {
  const decimals = currencyDecimals(currency);
  const negative = minor < 0;
  const abs = Math.abs(minor)
    .toString()
    .padStart(decimals + 1, "0");
  const whole = decimals ? abs.slice(0, -decimals) : abs;
  const frac = (decimals ? abs.slice(-decimals) : "").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** Minor units → major units as a number. Only for chart scales, never for storage or sums. */
export function toMajor(minor: Minor, currency: string): number {
  return minor / 10 ** currencyDecimals(currency);
}

export interface FormatOptions {
  locale?: string;
  /** "auto" shows "-" for negatives; "always" adds "+" for positives; "never" drops the sign */
  sign?: "auto" | "always" | "never";
  /** Compact notation, e.g. Rs 1.2M */
  compact?: boolean;
  /** Hide decimals when the amount is whole (default true) */
  trimWhole?: boolean;
  /** Omit the currency symbol */
  plain?: boolean;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(key: string, locale: string, opts: Intl.NumberFormatOptions) {
  let f = formatterCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, opts);
    } catch {
      f = new Intl.NumberFormat("en-US", opts);
    }
    formatterCache.set(key, f);
  }
  return f;
}

export function formatMoney(minor: Minor, currency: string, options: FormatOptions = {}): string {
  const {
    locale = "en-PK",
    sign = "auto",
    compact = false,
    trimWhole = true,
    plain = false,
  } = options;
  const decimals = currencyDecimals(currency);
  const isWhole = minor % 10 ** decimals === 0;
  const minFrac = compact || (trimWhole && isWhole) ? 0 : decimals;
  const maxFrac = compact ? 1 : decimals;
  const key = [locale, currency, minFrac, maxFrac, compact, sign, plain].join("|");
  const formatter = getFormatter(key, locale, {
    style: plain ? "decimal" : "currency",
    currency: plain ? undefined : currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
    notation: compact ? "compact" : "standard",
    signDisplay: sign === "always" ? "exceptZero" : sign === "never" ? "never" : "auto",
  });
  return formatter.format(toMajor(minor, currency));
}

/** Integer-safe sum of minor amounts. */
export function sumMinor(values: Iterable<Minor>): Minor {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Convert a Prisma BigInt to a safe JS number of minor units. */
export function bigToMinor(value: bigint | number | null | undefined): Minor {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new RangeError("Amount exceeds safe integer range");
  return n;
}

/** Percentage change for "vs last month" comparisons; null when there is no baseline. */
export function percentChange(current: Minor, previous: Minor): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
