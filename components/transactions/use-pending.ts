"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppData } from "@/components/providers/app-data";
import { listQueued, QUEUE_EVENT, type QueuedTransaction } from "@/lib/offline-queue";
import { parseLocalDateTime } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import type { AccountView, CategoryView, TransactionView, UserPrefs } from "@/lib/types";
import type { TransactionInput } from "@/lib/validators/finance";

export interface PendingTransactionView extends TransactionView {
  /** Always true — marks transactions that are queued offline, not yet synced. */
  pending: true;
}

/** Convert a queued offline input into a displayable transaction view. */
export function toPendingView(
  input: TransactionInput,
  clientId: string,
  accounts: AccountView[],
  categories: CategoryView[],
  prefs: UserPrefs,
): PendingTransactionView | null {
  const account = accounts.find((a) => a.id === input.accountId);
  if (!account) return null;
  const toAccount = input.toAccountId
    ? (accounts.find((a) => a.id === input.toAccountId) ?? null)
    : null;
  const category = input.categoryId
    ? (categories.find((c) => c.id === input.categoryId) ?? null)
    : null;
  const amount = parseMoney(input.amount || "0", account.currency);
  if (amount === null) return null;
  const occurredAt =
    parseLocalDateTime(input.occurredAt, prefs.timezone)?.toISOString() ??
    new Date().toISOString();

  return {
    id: `pending-${clientId}`,
    type: input.type,
    amount,
    toAmount: null,
    currency: account.currency,
    toCurrency: toAccount?.currency ?? null,
    occurredAt,
    title: input.title ?? "",
    note: input.note || null,
    receiptUrl: null,
    recurringRuleId: null,
    account: { id: account.id, name: account.name, color: account.color, icon: account.icon },
    toAccount: toAccount
      ? { id: toAccount.id, name: toAccount.name, color: toAccount.color, icon: toAccount.icon }
      : null,
    category: category
      ? { id: category.id, name: category.name, color: category.color, icon: category.icon }
      : null,
    tags: input.tags ?? [],
    pending: true,
  };
}

/** Queued offline transactions as displayable views. Updates live as the queue changes. */
export function usePendingTransactions(): PendingTransactionView[] {
  const { accounts, categories, prefs } = useAppData();
  const [queued, setQueued] = useState<QueuedTransaction[]>([]);

  const refresh = useCallback(async () => {
    try {
      setQueued(await listQueued());
    } catch {
      setQueued([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(QUEUE_EVENT, refresh);
    return () => window.removeEventListener(QUEUE_EVENT, refresh);
  }, [refresh]);

  return queued
    .map((q) => toPendingView(q.input, q.clientId, accounts, categories, prefs))
    .filter((v): v is PendingTransactionView => v !== null)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
