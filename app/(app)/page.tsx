import { ChartPie, Settings, Target } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/card";
import { AccountCarousel } from "@/components/dashboard/account-carousel";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { BudgetList } from "@/components/dashboard/budget-list";
import { MonthSummary } from "@/components/dashboard/month-summary";
import { CategoryBreakdown, TrendCard } from "@/components/dashboard/spending-cards";
import { EmptyState } from "@/components/empty-state";
import { RecentList } from "@/components/transactions/recent-list";
import { requireUser } from "@/lib/dal";
import { greeting } from "@/lib/dates";
import { getAccounts, netWorth } from "@/lib/queries/accounts";
import { getDashboardData } from "@/lib/queries/insights";
import { getRecentTransactions } from "@/lib/queries/transactions";

export default async function DashboardPage() {
  const user = await requireUser();
  const [accounts, data, recent] = await Promise.all([
    getAccounts(),
    getDashboardData(),
    getRecentTransactions(7),
  ]);
  const totals = netWorth(accounts);
  const firstName = user.name.split(" ")[0];
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-muted-foreground text-sm">{greeting(user.timezone)},</p>
          <h1 className="text-2xl font-bold tracking-tight">{firstName}</h1>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="pressable bg-surface-2 flex size-11 items-center justify-center rounded-full border text-sm font-bold lg:hidden"
        >
          {initials || <Settings className="size-5" aria-hidden="true" />}
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <BalanceCard totals={totals} monthNet={data.month.net} />
        <MonthSummary month={data.month} lastMonth={data.lastMonth} currency={data.currency} />
      </div>

      <AccountCarousel accounts={accounts} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Spending by category"
          action={
            <Link href="/reports" className="text-primary text-sm font-medium">
              Reports
            </Link>
          }
        >
          {data.categories.length ? (
            <CategoryBreakdown slices={data.categories} currency={data.currency} />
          ) : (
            <EmptyState icon={ChartPie} title="Nothing spent yet this month" className="py-6" />
          )}
        </Card>
        <Card title="Spending trend">
          <TrendCard data={data.trend} currency={data.currency} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Budgets"
          action={
            <Link href="/categories" className="text-primary text-sm font-medium">
              Edit
            </Link>
          }
        >
          {data.budgets.length ? (
            <BudgetList budgets={data.budgets} currency={data.currency} />
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
        <Card
          title="Recent transactions"
          action={
            <Link href="/transactions" className="text-primary text-sm font-medium">
              See all
            </Link>
          }
        >
          <RecentList items={recent} />
        </Card>
      </div>
    </div>
  );
}
