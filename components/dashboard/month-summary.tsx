import { ArrowDownRight, ArrowUpRight, PiggyBank } from "lucide-react";
import { Money } from "@/components/money";
import { percentChange } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Totals {
  income: number;
  expense: number;
  net: number;
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
}: {
  month: Totals;
  lastMonth: Totals;
  currency: string;
}) {
  const tiles = [
    {
      label: "Income",
      value: month.income,
      prev: lastMonth.income,
      icon: ArrowDownRight,
      tone: "text-income bg-income/12",
      goodWhenUp: true,
    },
    {
      label: "Expense",
      value: month.expense,
      prev: lastMonth.expense,
      icon: ArrowUpRight,
      tone: "text-expense bg-expense/12",
      goodWhenUp: false,
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
              i === 2 && "col-span-2 sm:col-span-1",
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("flex size-7 items-center justify-center rounded-lg", t.tone)}>
                <t.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="text-muted-foreground text-xs font-medium">{t.label}</span>
            </div>
            <Money value={t.value} currency={currency} className="mt-2 block text-lg font-bold" />
            <Delta current={t.value} previous={t.prev} goodWhenUp={t.goodWhenUp} />
          </div>
        ))}
      </div>
    </section>
  );
}
