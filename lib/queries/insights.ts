import "server-only";
import { tz } from "@date-fns/tz";
import { addDays, format, startOfWeek, subMonths } from "date-fns";
import { requireUser, type CurrentUser } from "@/lib/dal";
import {
  dayKey,
  type DateRange,
  eachDayKey,
  elapsedDays,
  monthRange,
  type Period,
  resolvePeriod,
  startOfDayTz,
} from "@/lib/dates";
import { db } from "@/lib/db";
import { bigToMinor } from "@/lib/money";
import type { CategoryView } from "@/lib/types";
import { getCategories } from "./categories";

interface FlowRow {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  occurredAt: Date;
  categoryId: string | null;
  title: string;
}

/** Income/expense rows in a range for accounts in one currency (no FX conversion in v1). */
async function loadFlows(
  user: CurrentUser,
  range: DateRange,
  currency: string,
): Promise<FlowRow[]> {
  const rows = await db.transaction.findMany({
    where: {
      userId: user.id,
      type: { in: ["INCOME", "EXPENSE"] },
      occurredAt: { gte: range.from, lt: range.to },
      account: { currency },
    },
    select: { type: true, amount: true, occurredAt: true, categoryId: true, title: true },
  });
  return rows.map((r) => ({ ...r, amount: bigToMinor(r.amount) }));
}

function totals(rows: FlowRow[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "INCOME") income += r.amount;
    else if (r.type === "EXPENSE") expense += r.amount;
  }
  return { income, expense, net: income - expense };
}

export interface CategorySlice {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  share: number;
}

/** Group expense amounts by top-level category (sub-categories roll up into their parent). */
function categoryBreakdown(
  rows: FlowRow[],
  categories: CategoryView[],
  type: "EXPENSE" | "INCOME",
) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const sums = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (r.type !== type) continue;
    total += r.amount;
    const cat = r.categoryId ? byId.get(r.categoryId) : undefined;
    const rootId =
      cat?.parentId && byId.has(cat.parentId) ? cat.parentId : (cat?.id ?? "uncategorized");
    sums.set(rootId, (sums.get(rootId) ?? 0) + r.amount);
  }
  const slices: CategorySlice[] = [...sums.entries()].map(([id, amount]) => {
    const c = byId.get(id);
    return {
      id,
      name: c?.name ?? "Uncategorized",
      color: c?.color ?? "#64748B",
      icon: c?.icon ?? "circle-ellipsis",
      amount,
      share: total ? amount / total : 0,
    };
  });
  return slices.sort((a, b) => b.amount - a.amount);
}

export interface BudgetProgress {
  id: string;
  name: string;
  color: string;
  icon: string;
  budget: number;
  spent: number;
  ratio: number;
}

export async function getDashboardData() {
  const user = await requireUser();
  const zone = user.timezone;
  const currency = user.defaultCurrency;
  const now = new Date();
  const thisMonth = monthRange(now, zone);
  const lastMonth = monthRange(subMonths(thisMonth.from, 1, { in: tz(zone) }), zone);
  const trendRange: DateRange = {
    from: startOfDayTz(addDays(now, -29), zone),
    to: addDays(startOfDayTz(now, zone), 1),
  };
  const earliest = trendRange.from < lastMonth.from ? trendRange.from : lastMonth.from;

  const [rows, categories] = await Promise.all([
    loadFlows(
      user,
      { from: earliest, to: thisMonth.to > trendRange.to ? thisMonth.to : trendRange.to },
      currency,
    ),
    getCategories(),
  ]);

  const inRange = (r: FlowRow, range: DateRange) =>
    r.occurredAt >= range.from && r.occurredAt < range.to;
  const current = rows.filter((r) => inRange(r, thisMonth));
  const previous = rows.filter((r) => inRange(r, lastMonth));

  // Daily expense trend (30 days)
  const daily = new Map(eachDayKey(trendRange, zone).map((k) => [k, 0]));
  for (const r of rows) {
    if (r.type !== "EXPENSE" || !inRange(r, trendRange)) continue;
    const k = dayKey(r.occurredAt, zone);
    daily.set(k, (daily.get(k) ?? 0) + r.amount);
  }

  // Budgets: a parent budget covers its sub-categories too.
  const spentByCategory = new Map<string, number>();
  for (const r of current) {
    if (r.type !== "EXPENSE" || !r.categoryId) continue;
    spentByCategory.set(r.categoryId, (spentByCategory.get(r.categoryId) ?? 0) + r.amount);
  }
  const budgets: BudgetProgress[] = categories
    .filter((c) => c.type === "EXPENSE" && c.monthlyBudget && c.monthlyBudget > 0)
    .map((c) => {
      const childIds = categories.filter((x) => x.parentId === c.id).map((x) => x.id);
      const spent = [c.id, ...childIds].reduce((s, id) => s + (spentByCategory.get(id) ?? 0), 0);
      const budget = c.monthlyBudget as number;
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        budget,
        spent,
        ratio: spent / budget,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);

  return {
    currency,
    month: totals(current),
    lastMonth: totals(previous),
    categories: categoryBreakdown(current, categories, "EXPENSE"),
    trend: [...daily.entries()].map(([date, amount]) => ({ date, amount })),
    budgets,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export interface ReportParams {
  period: Period;
  from?: string;
  to?: string;
  currency?: string;
}

export async function getReport(params: ReportParams) {
  const user = await requireUser();
  const zone = user.timezone;
  const range = resolvePeriod(params.period, zone, user.weekStart, {
    from: params.from,
    to: params.to,
  });

  const currencies = await db.account.findMany({
    where: { userId: user.id },
    distinct: ["currency"],
    select: { currency: true },
  });
  const currencyList = [...new Set([user.defaultCurrency, ...currencies.map((c) => c.currency)])];
  const currency =
    params.currency && currencyList.includes(params.currency)
      ? params.currency
      : user.defaultCurrency;

  const [rows, categories] = await Promise.all([
    loadFlows(user, range, currency),
    getCategories({ includeArchived: true }),
  ]);

  const sum = totals(rows);
  const days = Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000);
  const bucket: "day" | "week" | "month" = days <= 31 ? "day" : days <= 100 ? "week" : "month";
  const ctx = { in: tz(zone) };
  const bucketKey = (d: Date) =>
    bucket === "day"
      ? format(d, "yyyy-MM-dd", ctx)
      : bucket === "week"
        ? format(startOfWeek(d, { ...ctx, weekStartsOn: user.weekStart }), "yyyy-MM-dd", ctx)
        : format(d, "yyyy-MM", ctx);

  // Pre-fill buckets so empty periods still render.
  const series = new Map<string, { income: number; expense: number }>();
  for (const k of eachDayKey(range, zone)) {
    const key =
      bucket === "day"
        ? k
        : bucket === "week"
          ? format(
              startOfWeek(new Date(`${k}T12:00:00`), { weekStartsOn: user.weekStart }),
              "yyyy-MM-dd",
            )
          : k.slice(0, 7);
    if (!series.has(key)) series.set(key, { income: 0, expense: 0 });
  }
  for (const r of rows) {
    const k = bucketKey(r.occurredAt);
    const b = series.get(k) ?? { income: 0, expense: 0 };
    if (r.type === "INCOME") b.income += r.amount;
    else b.expense += r.amount;
    series.set(k, b);
  }

  const payees = new Map<string, { amount: number; count: number }>();
  for (const r of rows) {
    if (r.type !== "EXPENSE" || !r.title.trim()) continue;
    const name = r.title.trim();
    const p = payees.get(name) ?? { amount: 0, count: 0 };
    p.amount += r.amount;
    p.count++;
    payees.set(name, p);
  }

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    bucket,
    currency,
    currencies: currencyList,
    totals: sum,
    savingsRate: sum.income > 0 ? sum.net / sum.income : null,
    avgDailySpend: Math.round(sum.expense / elapsedDays(range, zone)),
    transactionCount: rows.length,
    series: [...series.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ key, ...v })),
    expenseCategories: categoryBreakdown(rows, categories, "EXPENSE"),
    incomeCategories: categoryBreakdown(rows, categories, "INCOME"),
    topPayees: [...payees.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
  };
}

export type ReportData = Awaited<ReturnType<typeof getReport>>;
