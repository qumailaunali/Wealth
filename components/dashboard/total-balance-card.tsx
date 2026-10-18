"use client";

import { Eye, EyeOff, Wallet } from "lucide-react";
import { useMemo } from "react";
import { usePrefs } from "@/components/providers/app-data";
import { totalsByCurrency } from "@/lib/balance";
import { convertTotals } from "@/lib/fx";
import { formatMoney } from "@/lib/money";
import type { AccountView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useHiddenAmounts } from "./use-hidden-amounts";

const MASK = "••••••";

/** Mobile hero: total balance with assets/liabilities and per-currency breakdown. */
export function TotalBalanceCard({
  accounts,
  className,
}: {
  accounts: AccountView[];
  className?: string;
}) {
  const prefs = usePrefs();
  const { hidden, toggle } = useHiddenAmounts();
  const currency = prefs.defaultCurrency;

  const details = useMemo(() => {
    const included = accounts.filter((a) => a.includeInTotal && !a.isArchived);
    const convert = (list: AccountView[]) =>
      convertTotals(totalsByCurrency(list), prefs.fxRates, currency);
    const all = convert(included);
    return {
      count: included.length,
      total: all.total,
      parts: [...all.parts].sort((a, b) => Math.abs(b.converted) - Math.abs(a.converted)),
      unconverted: Object.entries(all.unconverted),
      assets: convert(included.filter((a) => a.balance > 0)).total,
      liabilities: convert(included.filter((a) => a.balance < 0)).total,
    };
  }, [accounts, prefs.fxRates, currency]);

  const fmt = (value: number, cur = currency) =>
    hidden ? MASK : formatMoney(value, cur, { locale: prefs.locale });
  const showBreakdown = details.parts.length > 1 || details.unconverted.length > 0;

  return (
    <section
      aria-label="Total balance"
      className={cn(
        "via-card to-card from-primary/25 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br p-5 shadow-2xl shadow-black/20",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="bg-primary/20 absolute -top-16 -right-10 size-48 rounded-full blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary bg-primary/12 flex size-7 items-center justify-center rounded-lg">
              <Wallet className="size-4" aria-hidden="true" />
            </span>
            <p className="text-muted-foreground text-sm font-medium">Total balance</p>
          </div>
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

        <p className="num mt-1 truncate text-[2.4rem] leading-tight font-extrabold tracking-tight">
          {fmt(details.total)}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Across {details.count} {details.count === 1 ? "account" : "accounts"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/20 p-3">
            <p className="text-muted-foreground text-[11px] font-medium">Assets</p>
            <p className="num text-income mt-0.5 truncate text-base font-bold">
              {fmt(details.assets)}
            </p>
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <p className="text-muted-foreground text-[11px] font-medium">Liabilities</p>
            <p className="num text-expense mt-0.5 truncate text-base font-bold">
              {fmt(Math.abs(details.liabilities))}
            </p>
          </div>
        </div>

        {showBreakdown ? (
          <ul className="mt-4 divide-y divide-white/5 border-t border-white/10">
            {details.parts.map((p) => (
              <li key={p.currency} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.currency}</p>
                  {p.currency !== currency ? (
                    <p className="text-muted-foreground num truncate text-[11px]">
                      {fmt(p.original, p.currency)} @ {p.rate}
                    </p>
                  ) : null}
                </div>
                <span className="num text-sm font-semibold">{fmt(p.converted)}</span>
              </li>
            ))}
            {details.unconverted.map(([cur, amount]) => (
              <li key={cur} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{cur}</p>
                  <p className="text-muted-foreground text-[11px]">No rate set, not in total</p>
                </div>
                <span className="num text-sm font-semibold">{fmt(amount, cur)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
