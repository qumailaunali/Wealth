"use client";

import { ChartPie, Target } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/card";
import { AccountCarousel } from "@/components/dashboard/account-carousel";
import { BudgetList } from "@/components/dashboard/budget-list";
import { MonthExpenseCard } from "@/components/dashboard/month-expense-card";
import { MonthSummary } from "@/components/dashboard/month-summary";
import { TotalBalanceCard } from "@/components/dashboard/total-balance-card";
import { CategoryBreakdown, TrendCard } from "@/components/dashboard/spending-cards";
import { EmptyState } from "@/components/empty-state";
import { RecentList } from "@/components/transactions/recent-list";
import {
  usePendingTransactions,
  type PendingTransactionView,
} from "@/components/transactions/use-pending";
import { useAppData } from "@/components/providers/app-data";
import { dayKey } from "@/lib/dates";
import { convertTotals } from "@/lib/fx";
import type { AccountView, TransactionView } from "@/lib/types";
import type { DashboardData } from "@/lib/queries/insights";
import { totalsByCurrency } from "@/lib/balance";

/** Apply pending (offline-queued) transactions to account balances. */
function mergeAccounts(accounts: AccountView[], pending: PendingTransactionView[]): AccountView[] {
  if (!pending.length) return accounts;
  const delta = new Map<string, number>();
  for (const p of pending) {
    if (p.type === "EXPENSE") {
      delta.set(p.account.id, (delta.get(p.account.id) ?? 0) - p.amount);
    } else if (p.type === "INCOME") {
      delta.set(p.account.id, (delta.get(p.account.id) ?? 0) + p.amount);
    } else {
      delta.set(p.account.id, (delta.get(p.account.id) ?? 0) - p.amount);
      if (p.toAccount) {
        const toAmount = p.toAmount ?? p.amount;
        delta.set(p.toAccount.id, (delta.get(p.toAccount.id) ?? 0) + toAmount);
      }
    }
  }
  return accounts.map((a) => {
    const d = delta.get(a.id);
    return d ? { ...a, balance: a.balance + d } : a;
  });
}

/** Apply pending transactions to the dashboard insight data. */
function mergeInsights(
  data: DashboardData,
  pending: PendingTransactionView[],
  timezone: string,
): DashboardData {
  if (!pending.length) return data;
  const currency = data.currency;

  const month = { ...data.month };
  const categories = data.categories.map((c) => ({ ...c }));
  const trend = data.trend.map((t) => ({ ...t }));
  const budgets = data.budgets.map((b) => ({ ...b }));

  const trendByDate = new Map(trend.map((t) => [t.date, t]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  for (const p of pending) {
    if (p.currency !== currency) continue;
    if (p.type === "INCOME") {
      month.income += p.amount;
      month.net += p.amount;
    } else if (p.type === "EXPENSE") {
      month.expense += p.amount;
      month.net -= p.amount;
      // Category breakdown
      if (p.category) {
        const slice = catById.get(p.category.id);
        if (slice) {
          slice.amount += p.amount;
        } else {
          const fresh = {
            id: p.category.id,
            name: p.category.name,
            color: p.category.color,
            icon: p.category.icon,
            amount: p.amount,
            share: 0,
          };
          categories.push(fresh);
          catById.set(fresh.id, fresh);
        }
      }
      // Budgets
      for (const b of budgets) {
        if (b.id === p.category?.id) b.spent += p.amount;
      }
      // Trend
      const key = dayKey(new Date(p.occurredAt), timezone);
      const point = trendByDate.get(key);
      if (point) point.amount += p.amount;
    }
  }

  // Recompute category shares and re-sort.
  const totalCat = categories.reduce((s, c) => s + c.amount, 0);
  for (const c of categories) c.share = totalCat ? c.amount / totalCat : 0;
  categories.sort((a, b) => b.amount - a.amount);
  budgets.sort((a, b) => b.spent / b.budget - a.spent / a.budget);

  return { ...data, month, categories, trend, budgets };
}

export function DashboardClient({
  accounts,
  data,
  recent,
}: {
  accounts: AccountView[];
  data: DashboardData;
  recent: TransactionView[];
}) {
  const { prefs } = useAppData();
  const pending = usePendingTransactions();

  const mergedAccounts = useMemo(() => mergeAccounts(accounts, pending), [accounts, pending]);
  const mergedData = useMemo(
    () => mergeInsights(data, pending, prefs.timezone),
    [data, pending, prefs.timezone],
  );
  const mergedRecent = useMemo<TransactionView[]>(
    () => [...pending, ...recent].slice(0, 7),
    [pending, recent],
  );
  const totals = useMemo(() => totalsByCurrency(mergedAccounts), [mergedAccounts]);
  const balanceTotal = useMemo(
    () => convertTotals(totals, prefs.fxRates, prefs.defaultCurrency).total,
    [totals, prefs.fxRates, prefs.defaultCurrency],
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <MonthExpenseCard
          expense={mergedData.month.expense}
          prevExpense={mergedData.lastMonth.expense}
          currency={mergedData.currency}
        />
        <MonthSummary
          month={mergedData.month}
          lastMonth={mergedData.lastMonth}
          currency={mergedData.currency}
          balance={balanceTotal}
        />
        <TotalBalanceCard accounts={mergedAccounts} className="sm:hidden" />
      </div>

      <Card
        title="Recent transactions"
        action={
          <Link href="/transactions" className="text-primary text-sm font-medium">
            See all
          </Link>
        }
      >
        <RecentList items={mergedRecent} />
      </Card>

      <AccountCarousel accounts={mergedAccounts} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Spending by category"
          action={
            <Link href="/reports" className="text-primary text-sm font-medium">
              Reports
            </Link>
          }
        >
          {mergedData.categories.length ? (
            <CategoryBreakdown slices={mergedData.categories} currency={mergedData.currency} />
          ) : (
            <EmptyState icon={ChartPie} title="Nothing spent yet this month" className="py-6" />
          )}
        </Card>
        <Card title="Spending trend">
          <TrendCard data={mergedData.trend} currency={mergedData.currency} />
        </Card>
      </div>

      <Card
        title="Budgets"
        action={
          <Link href="/categories" className="text-primary text-sm font-medium">
            Edit
          </Link>
        }
      >
        {mergedData.budgets.length ? (
          <BudgetList budgets={mergedData.budgets} currency={mergedData.currency} />
        ) : (
          <EmptyState
            icon={Target}
            title="No budgets set"
            description="Add a monthly budget to a category to track it here."
            action={
              <Link href="/categories" className="text-primary text-sm font-semibold">
                Set a budget
              </Link>
            }
            className="py-6"
          />
        )}
      </Card>
    </>
  );
}
