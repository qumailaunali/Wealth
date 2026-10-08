"use client";

import { ArrowLeftRight, Repeat } from "lucide-react";
import { IconBadge } from "@/components/app-icon";
import { TxAmount } from "@/components/money";
import { usePrefs } from "@/components/providers/app-data";
import { formatInTz } from "@/lib/dates";
import type { TransactionView } from "@/lib/types";
import { useAddTransaction } from "./add-transaction-provider";

export function TransactionRow({
  tx,
  showDate = false,
}: {
  tx: TransactionView;
  showDate?: boolean;
}) {
  const { open } = useAddTransaction();
  const prefs = usePrefs();
  const when = formatInTz(
    new Date(tx.occurredAt),
    showDate ? "d MMM · h:mm a" : "h:mm a",
    prefs.timezone,
  );
  const title =
    tx.title ||
    (tx.type === "TRANSFER"
      ? `${tx.account.name} → ${tx.toAccount?.name ?? "?"}`
      : (tx.category?.name ?? "Untitled"));
  const subtitle =
    tx.type === "TRANSFER"
      ? `Transfer · ${tx.account.name} → ${tx.toAccount?.name ?? "?"}`
      : `${tx.category?.name ?? "Uncategorized"} · ${tx.account.name}`;

  return (
    <button
      type="button"
      onClick={() => open({ transaction: tx })}
      className="pressable hover:bg-surface-2/70 flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors"
    >
      {tx.type === "TRANSFER" ? (
        <span className="bg-transfer/15 text-transfer flex size-10 shrink-0 items-center justify-center rounded-xl">
          <ArrowLeftRight className="size-5" aria-hidden="true" />
        </span>
      ) : (
        <IconBadge
          name={tx.category?.icon ?? "circle-ellipsis"}
          color={tx.category?.color ?? "#64748B"}
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-medium">{title}</span>
          {tx.recurringRuleId ? (
            <Repeat className="text-muted-foreground size-3.5 shrink-0" aria-label="Recurring" />
          ) : null}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {subtitle} · {when}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <TxAmount
          type={tx.type}
          amount={tx.amount}
          currency={tx.currency}
          className="text-[15px]"
        />
        {tx.tags.length ? (
          <span className="text-muted-foreground max-w-24 truncate text-[11px]">
            #{tx.tags.join(" #")}
          </span>
        ) : null}
      </span>
    </button>
  );
}
