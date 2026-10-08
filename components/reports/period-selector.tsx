"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PERIODS } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function PeriodSelector({
  currencies,
  currency,
}: {
  currencies: string[];
  currency: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const period = params.get("period") ?? "month";
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  const update = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <div
        role="radiogroup"
        aria-label="Period"
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={period === p.value}
            onClick={() =>
              update({
                period: p.value,
                ...(p.value !== "custom" ? { from: undefined, to: undefined } : {}),
              })
            }
            className={cn(
              "pressable text-muted-foreground h-10 shrink-0 rounded-full border px-4 text-sm font-medium",
              period === p.value && "bg-foreground text-background border-transparent",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {period === "custom" ? (
        <form
          className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ from, to });
          }}
        >
          <label className="text-muted-foreground grid grid-cols-1 gap-1 text-xs">
            From
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </label>
          <label className="text-muted-foreground grid grid-cols-1 gap-1 text-xs">
            To
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
          </label>
          <button
            type="submit"
            className="bg-primary text-primary-foreground h-11 rounded-xl px-4 text-sm font-semibold"
          >
            Apply
          </button>
        </form>
      ) : null}
      {currencies.length > 1 ? (
        <div className="flex items-center gap-2">
          <label htmlFor="report-currency" className="text-muted-foreground text-sm">
            Currency
          </label>
          <div className="w-28">
            <NativeSelect
              id="report-currency"
              value={currency}
              onChange={(e) => update({ currency: e.target.value })}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      ) : null}
    </div>
  );
}
