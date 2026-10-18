import { ArrowDownRight, PiggyBank, Wallet } from "lucide-react";
import { Money } from "@/components/money";
import { percentChange } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Totals {
  income: number;
  expense: number;
  net: number;
}

interface Tile {
  label: string;
  value: number;
  /** Undefined hides the vs-last-month delta (e.g. for the balance tile). */
  prev?: number;
  icon: typeof Wallet;
  tone: string;
  goodWhenUp: boolean;
}

function Delta({
  current,
  previous,
  goodWhenUp,
}: {
  current: number;
  previous: number;
  goodWhenUp: boolean;
}) {
  const pct = percentChange(current, previous);
  if (pct === null)
    return <span className="text-muted-foreground text-[11px]">No data last month</span>;
  const up = pct >= 0;
  const good = up === goodWhenUp;
  return (
    <span className={cn("num text-[11px] font-medium", good ? "text-income" : "text-expense")}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%{" "}
      <span className="text-muted-foreground">vs last month</span>
    </span>
  );
}

export function MonthSummary({
  month,
  lastMonth,
  currency,
  balance,
}: {
  month: Totals;
  lastMonth: Totals;
  currency: string;
  /** Total balance across accounts (FX-converted) — takes the expense tile's slot. */
  balance: number;
}) {
  const tiles: Tile[] = [
    {
      label: "Income",
      value: month.income,
      prev: lastMonth.income,
      icon: ArrowDownRight,
      tone: "text-income bg-income/12",
      goodWhenUp: true,
    },
    {
      label: "Total balance",
      value: balance,
      icon: Wallet,
      tone: "text-primary bg-primary/12",
      goodWhenUp: true,
    },
    {
      label: "Net savings",
      value: month.net,
      prev: lastMonth.net,
      icon: PiggyBank,
      tone: "text-primary bg-primary/12",
      goodWhenUp: true,
    },
  ];
  return (
    <section aria-labelledby="month-heading">
      <h2 id="month-heading" className="mb-3 text-base font-semibold">
        This month
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className={cn(
              "bg-card rounded-2xl border p-3.5",
              // Mobile shows only Income; balance lives in TotalBalanceCard there.
              i === 0 ? "col-span-2 sm:col-span-1" : "hidden sm:block",
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("flex size-7 items-center justify-center rounded-lg", t.tone)}>
                <t.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="text-muted-foreground text-xs font-medium">{t.label}</span>
            </div>
            <Money value={t.value} currency={currency} className="mt-2 block text-lg font-bold" />
            {t.prev !== undefined ? (
              <Delta current={t.value} previous={t.prev} goodWhenUp={t.goodWhenUp} />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
