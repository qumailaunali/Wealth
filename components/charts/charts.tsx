"use client";

import { memo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";

/** Values stay in minor units; only formatting converts them. */
export interface ChartFormat {
  currency: string;
  locale: string;
}

function TooltipCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="bg-popover min-w-36 rounded-xl border px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1 font-medium">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground flex items-center gap-1.5">
            {r.color ? (
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: r.color }}
                aria-hidden="true"
              />
            ) : null}
            {r.label}
          </span>
          <span className="num text-foreground font-semibold">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

// ---------------------------------------------------------------------------
// Spending by category (donut)
// ---------------------------------------------------------------------------
export interface DonutSlice {
  id: string;
  name: string;
  color: string;
  amount: number;
}

export const SpendingDonut = memo(function SpendingDonut({
  slices,
  total,
  format,
}: {
  slices: DonutSlice[];
  total: number;
  format: ChartFormat;
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="amount"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={slices.length > 1 ? 2 : 0}
            cornerRadius={4}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.id} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            content={(p) => {
              const item = p.payload?.[0];
              if (!p.active || !item) return null;
              const slice = item.payload as DonutSlice;
              return (
                <TooltipCard
                  title={slice.name}
                  rows={[
                    {
                      label: "Spent",
                      value: formatMoney(slice.amount, format.currency, { locale: format.locale }),
                    },
                    { label: "Share", value: `${Math.round((slice.amount / total) * 100)}%` },
                  ]}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-muted-foreground text-xs">Spent</span>
        <span className="num text-lg font-bold">
          {formatMoney(total, format.currency, {
            locale: format.locale,
            compact: total >= 1_000_000_00,
          })}
        </span>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Daily spending trend (single series area)
// ---------------------------------------------------------------------------
export const TrendChart = memo(function TrendChart({
  data,
  format,
  labelFor,
}: {
  data: { date: string; amount: number }[];
  format: ChartFormat;
  labelFor: (date: string) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-expense)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-expense)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="date"
          tickFormatter={labelFor}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tickMargin={8}
        />
        <YAxis
          width={44}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickCount={4}
          tickFormatter={(v: number) =>
            formatMoney(v, format.currency, { locale: format.locale, compact: true, plain: true })
          }
        />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
          content={(p) => {
            const item = p.payload?.[0];
            if (!p.active || !item) return null;
            const row = item.payload as { date: string; amount: number };
            return (
              <TooltipCard
                title={labelFor(row.date)}
                rows={[
                  {
                    label: "Spent",
                    value: formatMoney(row.amount, format.currency, { locale: format.locale }),
                  },
                ]}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--chart-expense)"
          strokeWidth={2}
          fill="url(#trendFill)"
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

// ---------------------------------------------------------------------------
// Income vs expense (grouped bars)
// ---------------------------------------------------------------------------
export const IncomeExpenseChart = memo(function IncomeExpenseChart({
  data,
  format,
  labelFor,
}: {
  data: { key: string; income: number; expense: number }[];
  format: ChartFormat;
  labelFor: (key: string) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
        barGap={2}
        barCategoryGap="22%"
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="key"
          tickFormatter={labelFor}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
          tickMargin={8}
        />
        <YAxis
          width={44}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickCount={4}
          tickFormatter={(v: number) =>
            formatMoney(v, format.currency, { locale: format.locale, compact: true, plain: true })
          }
        />
        <Tooltip
          cursor={{ fill: "var(--chart-grid)" }}
          content={(p) => {
            const item = p.payload?.[0];
            if (!p.active || !item) return null;
            const row = item.payload as { key: string; income: number; expense: number };
            const fmt = (v: number) => formatMoney(v, format.currency, { locale: format.locale });
            return (
              <TooltipCard
                title={labelFor(row.key)}
                rows={[
                  { label: "Income", value: fmt(row.income), color: "var(--chart-income)" },
                  { label: "Expense", value: fmt(row.expense), color: "var(--chart-expense)" },
                  { label: "Net", value: fmt(row.income - row.expense) },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="income"
          name="Income"
          fill="var(--chart-income)"
          radius={[4, 4, 0, 0]}
          maxBarSize={18}
          isAnimationActive={false}
        />
        <Bar
          dataKey="expense"
          name="Expense"
          fill="var(--chart-expense)"
          radius={[4, 4, 0, 0]}
          maxBarSize={18}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});
