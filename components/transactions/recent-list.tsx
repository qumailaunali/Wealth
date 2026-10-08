"use client";

import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import type { TransactionView } from "@/lib/types";
import { useAddTransaction } from "./add-transaction-provider";
import { TransactionRow } from "./transaction-row";

export function RecentList({ items }: { items: TransactionView[] }) {
  const { open } = useAddTransaction();
  if (!items.length) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions yet"
        description="Log your first expense. It only takes a few seconds."
        action={<Button onClick={() => open()}>Add transaction</Button>}
        className="py-6"
      />
    );
  }
  return (
    <ul className="-mx-2 grid grid-cols-1 gap-0.5">
      {items.map((tx) => (
        <li key={tx.id}>
          <TransactionRow tx={tx} showDate />
        </li>
      ))}
    </ul>
  );
}
