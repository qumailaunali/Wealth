"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { IconBadge } from "@/components/app-icon";
import { Money } from "@/components/money";
import { isReceivable } from "@/lib/constants";
import type { AccountView } from "@/lib/types";
import { useHiddenAmounts } from "./use-hidden-amounts";

/** People who owe you money (paid on their behalf). Hidden when nobody does. */
export function ToCollectCard({ accounts }: { accounts: AccountView[] }) {
  const { hidden } = useHiddenAmounts();
  const people = accounts
    .filter((a) => isReceivable(a) && !a.isArchived && a.balance !== 0)
    .sort((a, b) => b.balance - a.balance);
  if (!people.length) return null;

  return (
    <section aria-labelledby="collect-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="collect-heading" className="text-base font-semibold">
          To collect
        </h2>
        <Link href="/accounts#owed-to-me" className="text-primary text-sm font-medium">
          All
        </Link>
      </div>
      <ul className="bg-card divide-y rounded-2xl border">
        {people.map((p) => (
          <li key={p.id}>
            <Link
              href={`/accounts/${p.id}`}
              className="pressable flex items-center gap-3 px-3.5 py-3"
            >
              <IconBadge name={p.icon} color={p.color} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
              {hidden ? (
                <span className="num text-sm font-semibold">••••</span>
              ) : (
                <Money
                  value={p.balance}
                  currency={p.currency}
                  className="text-warning text-sm font-semibold"
                />
              )}
              <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
