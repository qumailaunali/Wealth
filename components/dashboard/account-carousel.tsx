"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { IconBadge } from "@/components/app-icon";
import { Money } from "@/components/money";
import { accountTypeLabel } from "@/lib/constants";
import type { AccountView } from "@/lib/types";
import { useHiddenAmounts } from "./balance-card";

export function AccountCarousel({ accounts }: { accounts: AccountView[] }) {
  const { hidden } = useHiddenAmounts();
  return (
    <section aria-labelledby="accounts-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="accounts-heading" className="text-base font-semibold">
          Accounts
        </h2>
        <Link href="/accounts" className="text-primary text-sm font-medium">
          Manage
        </Link>
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {accounts.map((a) => {
          const owed = a.type === "CREDIT_CARD" && a.balance < 0;
          return (
            <li key={a.id} className="shrink-0 snap-start">
              <Link
                href={`/accounts/${a.id}`}
                className="pressable bg-card relative flex h-[118px] w-[164px] flex-col justify-between overflow-hidden rounded-2xl border p-3.5"
              >
                <span
                  aria-hidden="true"
                  className="absolute -top-8 -right-8 size-24 rounded-full opacity-25 blur-2xl"
                  style={{ backgroundColor: a.color }}
                />
                <span className="relative flex items-center gap-2">
                  <IconBadge name={a.icon} color={a.color} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{a.name}</span>
                    <span className="text-muted-foreground block truncate text-[11px]">
                      {accountTypeLabel(a.type)}
                    </span>
                  </span>
                </span>
                <span className="relative">
                  {owed ? (
                    <span className="text-expense block text-[11px] font-medium">Owed</span>
                  ) : null}
                  {hidden ? (
                    <span className="num text-lg font-bold">••••</span>
                  ) : (
                    <Money
                      value={owed ? Math.abs(a.balance) : a.balance}
                      currency={a.currency}
                      className={owed ? "text-expense text-lg font-bold" : "text-lg font-bold"}
                    />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 snap-start">
          <Link
            href="/accounts?new=1"
            className="pressable text-muted-foreground hover:text-foreground flex h-[118px] w-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium"
          >
            <Plus className="size-5" aria-hidden="true" />
            Add account
          </Link>
        </li>
      </ul>
    </section>
  );
}
