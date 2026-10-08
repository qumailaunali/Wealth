import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountsList, NewAccountButton } from "@/components/accounts/accounts-list";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/dal";
import { getAccounts, netWorth } from "@/lib/queries/accounts";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await getAccounts({ includeArchived: true });
  const totals = Object.entries(netWorth(accounts)).sort(([a], [b]) =>
    a === user.defaultCurrency ? -1 : b === user.defaultCurrency ? 1 : a.localeCompare(b),
  );

  return (
    <>
      <PageHeader
        title="Accounts"
        backHref="/more"
        actions={
          <Suspense>
            <NewAccountButton />
          </Suspense>
        }
      />
      {totals.length ? (
        <section aria-label="Net worth" className="bg-card mb-6 rounded-3xl border p-4">
          <p className="text-muted-foreground text-sm">Net worth</p>
          <div className="mt-1 grid grid-cols-1 gap-1">
            {totals.map(([currency, total], i) => (
              <Money
                key={currency}
                value={total}
                currency={currency}
                className={
                  i === 0
                    ? "text-3xl font-extrabold tracking-tight"
                    : "text-muted-foreground text-base font-semibold"
                }
              />
            ))}
          </div>
          {totals.length > 1 ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Totals are shown per currency (no conversion).
            </p>
          ) : null}
        </section>
      ) : null}
      <AccountsList accounts={accounts} />
    </>
  );
}
