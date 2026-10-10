import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountActions } from "@/components/accounts/account-actions";
import { IconBadge } from "@/components/app-icon";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/layout/page-header";
import { Money } from "@/components/money";
import { RecentList } from "@/components/transactions/recent-list";
import { accountTypeLabel } from "@/lib/constants";
import { getAccount } from "@/lib/queries/accounts";
import { listTransactions } from "@/lib/queries/transactions";

export const metadata: Metadata = { title: "Account" };

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Both queries are scoped to the signed-in user, so they can run in parallel.
  const [data, recent] = await Promise.all([
    getAccount(id),
    listTransactions({ accountId: id }, null, 15),
  ]);
  if (!data) notFound();
  const { account, flows, txCount } = data;
  const owed = account.balance < 0;

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={account.name}
        subtitle={`${accountTypeLabel(account.type)} · ${account.currency}`}
        backHref="/accounts"
      />

      <section
        aria-label="Balance"
        className="bg-card relative overflow-hidden rounded-3xl border p-5"
        style={{
          backgroundImage: `radial-gradient(120% 120% at 100% 0%, ${account.color}33 0%, transparent 55%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <IconBadge name={account.icon} color={account.color} size="lg" />
          <div>
            <p className="text-muted-foreground text-sm">
              {owed && account.type === "CREDIT_CARD" ? "Amount owed" : "Balance"}
            </p>
            <Money
              value={
                owed && account.type === "CREDIT_CARD" ? Math.abs(account.balance) : account.balance
              }
              currency={account.currency}
              className={owed ? "text-expense text-3xl font-extrabold" : "text-3xl font-extrabold"}
            />
          </div>
        </div>
        {account.isArchived ? (
          <p className="bg-warning/15 text-warning mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium">
            Archived
          </p>
        ) : null}
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            { label: "Opening", value: account.openingBalance },
            { label: "Income", value: flows.income },
            { label: "Expenses", value: -flows.expense },
            { label: "Transfers", value: flows.transferIn - flows.transferOut },
          ].map((s) => (
            <div key={s.label} className="bg-surface-2/60 rounded-2xl p-3">
              <dt className="text-muted-foreground text-xs">{s.label}</dt>
              <dd>
                <Money value={s.value} currency={account.currency} className="font-semibold" />
              </dd>
            </div>
          ))}
        </dl>
        {account.note ? <p className="text-muted-foreground mt-4 text-sm">{account.note}</p> : null}
      </section>

      <AccountActions account={account} txCount={txCount} />

      <Card
        title="Transactions"
        action={
          txCount > 0 ? (
            <Link
              href={`/transactions?accountId=${account.id}`}
              className="text-primary text-sm font-medium"
            >
              See all ({txCount})
            </Link>
          ) : null
        }
      >
        <RecentList items={recent.items} />
      </Card>
    </div>
  );
}
