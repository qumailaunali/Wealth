import { ChartPie, Download, Store } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { IconBadge } from "@/components/app-icon";
import { Card } from "@/components/card";
import { CategoryBreakdown, IncomeExpenseCard } from "@/components/dashboard/spending-cards";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Money } from "@/components/money";
import { PeriodSelector } from "@/components/reports/period-selector";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/dal";
import { formatInTz, type Period, PERIODS } from "@/lib/dates";
import { getReport } from "@/lib/queries/insights";

export const metadata: Metadata = { title: "Reports" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const periodRaw = one(sp.period);
  const period = (PERIODS.some((p) => p.value === periodRaw) ? periodRaw : "month") as Period;
  const report = await getReport({
    period,
    from: one(sp.from),
    to: one(sp.to),
    currency: one(sp.currency),
  });

  const from = new Date(report.range.from);
  const toInclusive = new Date(new Date(report.range.to).getTime() - 1);
  const rangeLabel = `${formatInTz(from, "d MMM", user.timezone)} – ${formatInTz(toInclusive, "d MMM yyyy", user.timezone)}`;
  const exportQuery = new URLSearchParams({
    from: formatInTz(from, "yyyy-MM-dd", user.timezone),
    to: formatInTz(toInclusive, "yyyy-MM-dd", user.timezone),
  });
  const topCategories = report.expenseCategories.slice(0, 5);
  const maxCategory = topCategories[0]?.amount ?? 1;

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader
        title="Reports"
        subtitle={rangeLabel}
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/export/csv?${exportQuery.toString()}`} download>
              <Download aria-hidden="true" /> CSV
            </a>
          </Button>
        }
      />
      <Suspense>
        <PeriodSelector currencies={report.currencies} currency={report.currency} />
      </Suspense>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Income", value: report.totals.income, className: "text-income" },
          { label: "Expenses", value: report.totals.expense, className: "text-expense" },
          {
            label: "Net",
            value: report.totals.net,
            className: report.totals.net < 0 ? "text-expense" : "",
          },
          { label: "Avg. daily spend", value: report.avgDailySpend, className: "" },
        ].map((t) => (
          <div key={t.label} className="bg-card rounded-2xl border p-3.5">
            <p className="text-muted-foreground text-xs">{t.label}</p>
            <Money
              value={t.value}
              currency={report.currency}
              className={`mt-1 block text-lg font-bold ${t.className}`}
            />
          </div>
        ))}
      </section>
      {report.savingsRate !== null ? (
        <p className="text-muted-foreground -mt-2 text-sm">
          You saved{" "}
          <span className="text-foreground font-semibold">
            {Math.round(report.savingsRate * 100)}%
          </span>{" "}
          of your income · {report.transactionCount} transactions
        </p>
      ) : null}

      {report.transactionCount === 0 ? (
        <EmptyState
          icon={ChartPie}
          title="No activity in this period"
          description="Try a longer period."
        />
      ) : (
        <>
          <Card title="Income vs expense">
            <IncomeExpenseCard
              series={report.series}
              bucket={report.bucket}
              currency={report.currency}
            />
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="Category breakdown">
              {report.expenseCategories.length ? (
                <CategoryBreakdown slices={report.expenseCategories} currency={report.currency} />
              ) : (
                <p className="text-muted-foreground text-sm">No expenses in this period.</p>
              )}
            </Card>

            <Card title="Top categories">
              <ol className="grid grid-cols-1 gap-4">
                {topCategories.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <span className="num text-muted-foreground w-4 text-xs">{i + 1}</span>
                    <IconBadge name={c.icon} color={c.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.name}</span>
                        <Money
                          value={c.amount}
                          currency={report.currency}
                          className="text-sm font-semibold"
                        />
                      </div>
                      <div className="bg-surface-2 mt-1.5 h-1.5 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(c.amount / maxCategory) * 100}%`,
                            backgroundColor: c.color,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="Top payees">
              {report.topPayees.length ? (
                <ol className="grid grid-cols-1 gap-3">
                  {report.topPayees.map((p) => (
                    <li key={p.name} className="flex items-center gap-3">
                      <span className="bg-surface-2 text-muted-foreground flex size-8 items-center justify-center rounded-lg">
                        <Store className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {p.count} payment{p.count === 1 ? "" : "s"}
                        </span>
                      </span>
                      <Money
                        value={p.amount}
                        currency={report.currency}
                        className="text-sm font-semibold"
                      />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Add a payee/title to expenses to see them here.
                </p>
              )}
            </Card>
            <Card title="Income sources">
              {report.incomeCategories.length ? (
                <ul className="grid grid-cols-1 gap-3">
                  {report.incomeCategories.map((c) => (
                    <li key={c.id} className="flex items-center gap-3">
                      <IconBadge name={c.icon} color={c.color} size="sm" />
                      <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                      <span className="num text-muted-foreground text-xs">
                        {Math.round(c.share * 100)}%
                      </span>
                      <Money
                        value={c.amount}
                        currency={report.currency}
                        className="text-sm font-semibold"
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No income in this period.</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
