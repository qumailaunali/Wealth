"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrefs } from "@/components/providers/app-data";
import { formatMoney, percentChange } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useHiddenAmounts } from "./use-hidden-amounts";

/** Hero card: total spent this month (replaces the old total-balance hero). */
export function MonthExpenseCard({
  expense,
  prevExpense,
  currency,
}: {
  expense: number;
  prevExpense: number;
  currency: string;
}) {
  const prefs = usePrefs();
  const { hidden, toggle } = useHiddenAmounts();
  const pct = percentChange(expense, prevExpense);
  const up = pct !== null && pct >= 0;

  return (
    <section
      aria-label="Spent this month"
      className="via-card to-card from-expense/25 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br p-5 shadow-2xl shadow-black/20"
    >
      <div
        aria-hidden="true"
        className="bg-expense/20 absolute -top-16 -right-10 size-48 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="bg-expense/10 absolute -bottom-20 -left-10 size-40 rounded-full blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm font-medium">Spent this month</p>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={hidden}
            aria-label={hidden ? "Show amounts" : "Hide amounts"}
            className="pressable text-muted-foreground hover:text-foreground -mr-2 flex size-11 items-center justify-center rounded-xl"
          >
            {hidden ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="mt-1 block max-w-full truncate text-left"
          aria-label={hidden ? "Amounts hidden, tap to show" : "Tap to hide amounts"}
        >
          <span className="num text-[2.6rem] leading-tight font-extrabold tracking-tight">
            {hidden ? (
              <span aria-hidden="true">••••••</span>
            ) : (
              formatMoney(expense, currency, { locale: prefs.locale })
            )}
          </span>
        </button>
        {pct !== null ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-medium">
            <span className={cn("num", up ? "text-expense" : "text-income")}>
              {hidden ? "••••" : `${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(0)}%`}
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
