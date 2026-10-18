"use client";

import { ChevronRight, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { usePrefs } from "@/components/providers/app-data";
import { totalsByCurrency } from "@/lib/balance";
import { isReceivable } from "@/lib/constants";
import { convertTotals } from "@/lib/fx";
import { formatMoney } from "@/lib/money";
import type { AccountView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useHiddenAmounts } from "./use-hidden-amounts";

const MASK = "••••••";

/** Mobile: compact one-row card with the FX-converted available balance. */
export function TotalBalanceCard({
  accounts,
  className,
}: {
  accounts: AccountView[];
  className?: string;
}) {
  const prefs = usePrefs();
  const { hidden } = useHiddenAmounts();
  const currency = prefs.defaultCurrency;

  const { total, count, toCollect, excluded } = useMemo(() => {
    const included = accounts.filter((a) => a.includeInTotal && !a.isArchived);
    const convert = (list: AccountView[]) =>
      convertTotals(totalsByCurrency(list), prefs.fxRates, currency);
    const converted = convert(included);
    return {
      total: converted.total,
      count: included.filter((a) => !isReceivable(a)).length,
      // Money paid on others' behalf: part of the total, not in any account.
      toCollect: convert(included.filter((a) => isReceivable(a) && a.balance > 0)).total,
      excluded: Object.keys(converted.unconverted),
    };
  }, [accounts, prefs.fxRates, currency]);

  return (
    <Link
      href="/accounts"
      aria-label="Available balance, view accounts"
      className={cn("pressable bg-card flex items-center gap-3 rounded-2xl border p-4", className)}
    >
      <span className="text-primary bg-primary/12 flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Wallet className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground block text-xs font-medium">Available balance</span>
        <span className="num block truncate text-2xl font-bold tracking-tight">
          {hidden ? MASK : formatMoney(total, currency, { locale: prefs.locale })}
        </span>
        <span className="text-muted-foreground block truncate text-[11px]">
          {count} {count === 1 ? "account" : "accounts"}
          {toCollect > 0
            ? ` · incl. ${hidden ? "••••" : formatMoney(toCollect, currency, { locale: prefs.locale })} to collect`
            : ""}
          {excluded.length ? ` · excl. ${excluded.join(", ")} (no rate)` : ""}
        </span>
      </span>
      <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}
