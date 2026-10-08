"use client";

import { usePrefs } from "@/components/providers/app-data";
import { formatMoney, type FormatOptions } from "@/lib/money";
import type { TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Formats minor units with the user's locale and tabular numerals. */
export function Money({
  value,
  currency,
  className,
  tone,
  ...options
}: {
  value: number;
  currency?: string;
  className?: string;
  /** Colour by meaning: income green, expense red, transfer blue, auto = by sign */
  tone?: TxType | "auto";
} & Omit<FormatOptions, "locale">) {
  const prefs = usePrefs();
  const cur = currency ?? prefs.defaultCurrency;
  const color =
    tone === "INCOME"
      ? "text-income"
      : tone === "EXPENSE"
        ? "text-expense"
        : tone === "TRANSFER"
          ? "text-transfer"
          : tone === "auto"
            ? value < 0
              ? "text-expense"
              : value > 0
                ? "text-income"
                : undefined
            : undefined;
  return (
    <span className={cn("num whitespace-nowrap", color, className)}>
      {formatMoney(value, cur, { locale: prefs.locale, ...options })}
    </span>
  );
}

/** Signed amount for a transaction row: −Rs 500 / +Rs 500 / Rs 500 (transfer). */
export function TxAmount({
  type,
  amount,
  currency,
  className,
}: {
  type: TxType;
  amount: number;
  currency: string;
  className?: string;
}) {
  const signed = type === "EXPENSE" ? -amount : amount;
  return (
    <Money
      value={signed}
      currency={currency}
      sign={type === "TRANSFER" ? "never" : "always"}
      tone={type === "EXPENSE" ? undefined : type}
      className={cn("font-semibold", type === "EXPENSE" && "text-foreground", className)}
    />
  );
}
