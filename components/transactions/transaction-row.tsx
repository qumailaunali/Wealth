"use client";

import { ArrowLeftRight, HandCoins, Repeat } from "lucide-react";
import { useMemo } from "react";
import { IconBadge } from "@/components/app-icon";
import { TxAmount } from "@/components/money";
import { useAppData } from "@/components/providers/app-data";
import { isReceivable } from "@/lib/constants";
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
  const { accounts, prefs } = useAppData();
  const personIds = useMemo(
    () => new Set(accounts.filter(isReceivable).map((a) => a.id)),
    [accounts],
  );
  const when = formatInTz(
    new Date(tx.occurredAt),
    showDate ? "d MMM · h:mm a" : "h:mm a",
    prefs.timezone,
  );
  // Transfers into/out of an "Owed to me" account read as paid-for / paid-back.
  const lentTo =
    tx.type === "TRANSFER" && tx.toAccount && personIds.has(tx.toAccount.id) ? tx.toAccount : null;
  const repaidBy =
    tx.type === "TRANSFER" && !lentTo && personIds.has(tx.account.id) ? tx.account : null;
  const title =
    tx.title ||
    (lentTo
      ? `Paid for ${lentTo.name}`
      : repaidBy
        ? `${repaidBy.name} paid back`
        : tx.type === "TRANSFER"
          ? `${tx.account.name} → ${tx.toAccount?.name ?? "?"}`
          : (tx.category?.name ?? "Untitled"));
  const subtitle = lentTo
    ? `Paid for ${lentTo.name} · from ${tx.account.name}`
    : repaidBy
      ? `${repaidBy.name} paid back · to ${tx.toAccount?.name ?? "?"}`
      : tx.type === "TRANSFER"
        ? `Transfer · ${tx.account.name} → ${tx.toAccount?.name ?? "?"}`
        : `${tx.category?.name ?? "Uncategorized"} · ${tx.account.name}`;

  return (
    <button
      type="button"
      onClick={() => open({ transaction: tx })}
      className="pressable hover:bg-surface-2/70 flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors"
    >
      {lentTo || repaidBy ? (
        <span className="bg-warning/15 text-warning flex size-10 shrink-0 items-center justify-center rounded-xl">
          <HandCoins className="size-5" aria-hidden="true" />
        </span>
      ) : tx.type === "TRANSFER" ? (
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
          {"pending" in tx && tx.pending ? (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              Pending
            </span>
          ) : null}
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
