"use client";

import { ChevronRight, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconBadge } from "@/components/app-icon";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { accountTypeLabel } from "@/lib/constants";
import type { AccountView } from "@/lib/types";
import { AccountFormSheet } from "./account-form-sheet";

export function NewAccountButton() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const open = params.get("new") === "1";
  const setOpen = (o: boolean) =>
    router.replace(o ? `${pathname}?new=1` : pathname, { scroll: false });
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" /> New
      </Button>
      <AccountFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

function AccountItem({ a }: { a: AccountView }) {
  const owed = a.balance < 0;
  return (
    <li>
      <Link
        href={`/accounts/${a.id}`}
        className="pressable hover:bg-surface-2/70 flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors"
      >
        <IconBadge name={a.icon} color={a.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{a.name}</span>
          <span className="text-muted-foreground block truncate text-xs">
            {accountTypeLabel(a.type)} · {a.currency}
            {!a.includeInTotal ? " · excluded from total" : ""}
          </span>
        </span>
        <span className="text-right">
          {owed && a.type === "CREDIT_CARD" ? (
            <span className="text-expense block text-[11px] font-medium">Owed</span>
          ) : null}
          <Money
            value={owed && a.type === "CREDIT_CARD" ? Math.abs(a.balance) : a.balance}
            currency={a.currency}
            className={owed ? "text-expense font-semibold" : "font-semibold"}
          />
        </span>
        <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
      </Link>
    </li>
  );
}

export function AccountsList({ accounts }: { accounts: AccountView[] }) {
  const router = useRouter();
  const active = accounts.filter((a) => !a.isArchived);
  const archived = accounts.filter((a) => a.isArchived);
  if (!accounts.length) {
    return (
      <EmptyState
        icon={Wallet}
        title="No accounts yet"
        description="Add your cash, bank accounts, wallets and cards to see your total balance."
        action={<Button onClick={() => router.replace("/accounts?new=1")}>Add account</Button>}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6">
      <ul className="-mx-3 grid grid-cols-1 gap-0.5">
        {active.map((a) => (
          <AccountItem key={a.id} a={a} />
        ))}
      </ul>
      {archived.length ? (
        <section aria-labelledby="archived-heading">
          <h2 id="archived-heading" className="text-muted-foreground mb-2 text-sm font-semibold">
            Archived
          </h2>
          <ul className="-mx-3 grid grid-cols-1 gap-0.5 opacity-70">
            {archived.map((a) => (
              <AccountItem key={a.id} a={a} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
