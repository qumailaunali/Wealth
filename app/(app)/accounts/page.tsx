import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountsList, NewAccountButton } from "@/components/accounts/accounts-list";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/dal";
import { convertTotals } from "@/lib/fx";
import { getAccounts, netWorth } from "@/lib/queries/accounts";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await getAccounts({ includeArchived: true });
  const converted = convertTotals(netWorth(accounts), user.fxRates, user.defaultCurrency);
  const totals = converted.parts.sort((a, b) =>
    a.currency === user.defaultCurrency
      ? -1
      : b.currency === user.defaultCurrency
        ? 1
        : a.currency.localeCompare(b.currency),
  );
  const unconverted = Object.entries(converted.unconverted);

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
      {totals.length || unconverted.length ? (
        <section aria-label="Net worth" className="bg-card mb-6 rounded-3xl border p-4">
          <p className="text-muted-foreground text-sm">Net worth</p>
          <Money
            value={converted.total}
            currency={user.defaultCurrency}
            className="mt-1 text-3xl font-extrabold tracking-tight"
          />
          <div className="mt-2 grid grid-cols-1 gap-1">
            {totals
              .filter((p) => p.currency !== user.defaultCurrency)
              .map((p) => (
                <p key={p.currency} className="text-muted-foreground text-sm font-semibold">
                  <Money value={p.original} currency={p.currency} /> →{" "}
                  <Money value={p.converted} currency={user.defaultCurrency} />
                </p>
              ))}
            {unconverted.map(([currency, total]) => (
              <p key={currency} className="text-muted-foreground text-sm font-semibold">
                <Money value={total} currency={currency} /> · set a rate in Settings
              </p>
            ))}
          </div>
        </section>
      ) : null}
      <AccountsList accounts={accounts} />
    </>
  );
}
