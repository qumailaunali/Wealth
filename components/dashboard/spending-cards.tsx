"use client";

import { format, parse } from "date-fns";
import { useMemo, useState } from "react";
import { IncomeExpenseChart, SpendingDonut, TrendChart } from "@/components/charts/lazy";
import { Money } from "@/components/money";
import { usePrefs } from "@/components/providers/app-data";
import { Segmented } from "@/components/ui/segmented";
import { formatMoney } from "@/lib/money";

export interface Slice {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  share: number;
}

/** Top slices plus an "Other" bucket so the donut never needs more than 6 hues. */
function foldSlices(slices: Slice[], max = 5): Slice[] {
  if (slices.length <= max + 1) return slices;
  const head = slices.slice(0, max);
  const tail = slices.slice(max);
  const amount = tail.reduce((s, x) => s + x.amount, 0);
  const share = tail.reduce((s, x) => s + x.share, 0);
  return [
    ...head,
    { id: "other", name: "Other", color: "#64748B", icon: "circle-ellipsis", amount, share },
  ];
}

export function CategoryBreakdown({ slices, currency }: { slices: Slice[]; currency: string }) {
  const prefs = usePrefs();
  const folded = useMemo(() => foldSlices(slices), [slices]);
  const total = slices.reduce((s, x) => s + x.amount, 0);
  return (
    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
      <SpendingDonut slices={folded} total={total} format={{ currency, locale: prefs.locale }} />
      <ul className="grid grid-cols-1 gap-2.5" aria-label="Spending by category">
        {folded.map((s) => (
          <li key={s.id} className="flex items-center gap-3 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="num text-muted-foreground w-10 text-right text-xs">
              {Math.round(s.share * 100)}%
            </span>
            <Money value={s.amount} currency={currency} className="w-24 text-right font-medium" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendCard({
  data,
  currency,
}: {
  data: { date: string; amount: number }[];
  currency: string;
}) {
  const prefs = usePrefs();
  const [range, setRange] = useState<"7" | "30">("7");
  const shown = range === "7" ? data.slice(-7) : data;
  const total = shown.reduce((s, d) => s + d.amount, 0);
  const labelFor = (d: string) => {
    const date = parse(d, "yyyy-MM-dd", new Date());
    return range === "7" ? format(date, "EEE") : format(date, "d MMM");
  };
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs">Last {range} days</p>
          <Money value={total} currency={currency} className="text-lg font-bold" />
          <span className="text-muted-foreground ml-2 text-xs">
            ~{formatMoney(Math.round(total / shown.length), currency, { locale: prefs.locale })}/day
          </span>
        </div>
        <Segmented
          label="Trend range"
          size="sm"
          className="w-28"
          value={range}
          onChange={setRange}
          options={[
            { value: "7", label: "7D" },
            { value: "30", label: "30D" },
          ]}
        />
      </div>
      <TrendChart data={shown} format={{ currency, locale: prefs.locale }} labelFor={labelFor} />
    </div>
  );
}

export function IncomeExpenseCard({
  series,
  bucket,
  currency,
}: {
  series: { key: string; income: number; expense: number }[];
  bucket: "day" | "week" | "month";
  currency: string;
}) {
  const prefs = usePrefs();
  const labelFor = (key: string) => {
    if (bucket === "month") return format(parse(key, "yyyy-MM", new Date()), "MMM");
    const d = parse(key, "yyyy-MM-dd", new Date());
    return bucket === "week" ? format(d, "d MMM") : format(d, series.length > 10 ? "d" : "EEE d");
  };
  return (
    <div>
      <div
        className="text-muted-foreground mb-2 flex items-center gap-4 text-xs"
        aria-hidden="true"
      >
        <span className="flex items-center gap-1.5">
          <span className="bg-chart-income size-2.5 rounded-sm" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-chart-expense size-2.5 rounded-sm" /> Expense
        </span>
      </div>
      <IncomeExpenseChart
        data={series}
        format={{ currency, locale: prefs.locale }}
        labelFor={labelFor}
      />
    </div>
  );
}
