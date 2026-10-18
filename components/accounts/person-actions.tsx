"use client";

import { HandCoins, Undo2 } from "lucide-react";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";
import { Button } from "@/components/ui/button";
import type { AccountView } from "@/lib/types";

/** Quick actions for an "Owed to me" account. */
export function PersonActions({ person }: { person: AccountView }) {
  const { open } = useAddTransaction();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        size="lg"
        disabled={person.balance <= 0}
        onClick={() =>
          open({
            type: "TRANSFER",
            preset: {
              accountId: person.id,
              amount: person.balance > 0 ? person.balance : undefined,
            },
          })
        }
      >
        <Undo2 aria-hidden="true" /> Got it back
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => open({ type: "LENT", preset: { toAccountId: person.id } })}
      >
        <HandCoins aria-hidden="true" /> Paid for them
      </Button>
    </div>
  );
}
