import { currencyDecimals, type Minor } from "./money";

export interface ConvertedPart {
  /** Account currency, e.g. "USD". */
  currency: string;
  /** Total in the account currency's minor units. */
  original: Minor;
  /** Same total converted to the default currency's minor units. */
  converted: Minor;
  /** Rate used: 1 unit of `currency` = `rate` default-currency units. */
  rate: number;
}

export interface ConvertedTotals {
  /** Grand total in the default currency's minor units. */
  total: Minor;
  /** Per-currency contributions that were converted (default currency included). */
  parts: ConvertedPart[];
  /** Currencies with no usable rate — shown unconverted. */
  unconverted: Record<string, Minor>;
}

/**
 * Fold per-currency totals into a single default-currency total using the user's
 * FX rates ({ USD: 278.5 } = 1 USD buys 278.5 default currency). Amounts stay in
 * minor units throughout; conversion rounds once per currency.
 */
export function convertTotals(
  totals: Record<string, Minor>,
  rates: Record<string, number>,
  defaultCurrency: string,
): ConvertedTotals {
  const parts: ConvertedPart[] = [];
  const unconverted: Record<string, Minor> = {};
  let total = 0;
  const toDec = currencyDecimals(defaultCurrency);
  for (const [currency, amount] of Object.entries(totals)) {
    if (currency === defaultCurrency) {
      total += amount;
      parts.push({ currency, original: amount, converted: amount, rate: 1 });
      continue;
    }
    const rate = rates[currency];
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      unconverted[currency] = (unconverted[currency] ?? 0) + amount;
      continue;
    }
    const fromDec = currencyDecimals(currency);
    const converted = Math.round((amount / 10 ** fromDec) * rate * 10 ** toDec);
    total += converted;
    const existing = parts.find((p) => p.currency === currency);
    if (existing) {
      existing.original += amount;
      existing.converted += converted;
    } else {
      parts.push({ currency, original: amount, converted, rate });
    }
  }
  return { total, parts, unconverted };
}
