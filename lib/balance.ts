/**
 * Pure balance math. Balances are always derived from the ledger, never stored:
 *   balance = opening + income − expense − transfersOut + transfersIn
 */
import type { Minor } from "./money";

export interface AccountFlows {
  income: Minor;
  expense: Minor;
  transferOut: Minor;
  transferIn: Minor;
}

export const EMPTY_FLOWS: AccountFlows = { income: 0, expense: 0, transferOut: 0, transferIn: 0 };

export function computeBalance(openingBalance: Minor, flows: AccountFlows = EMPTY_FLOWS): Minor {
  return openingBalance + flows.income - flows.expense - flows.transferOut + flows.transferIn;
}

export interface LedgerRow {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  accountId: string;
  toAccountId: string | null;
  amount: Minor;
  toAmount: Minor | null;
}

/** Fold ledger rows into per-account flows (used by tests and small in-memory computations). */
export function flowsFromLedger(rows: LedgerRow[]): Map<string, AccountFlows> {
  const map = new Map<string, AccountFlows>();
  const get = (id: string) => {
    let f = map.get(id);
    if (!f) {
      f = { ...EMPTY_FLOWS };
      map.set(id, f);
    }
    return f;
  };
  for (const row of rows) {
    if (row.type === "INCOME") get(row.accountId).income += row.amount;
    else if (row.type === "EXPENSE") get(row.accountId).expense += row.amount;
    else {
      get(row.accountId).transferOut += row.amount;
      if (row.toAccountId) get(row.toAccountId).transferIn += row.toAmount ?? row.amount;
    }
  }
  return map;
}

export interface BalanceForTotal {
  currency: string;
  balance: Minor;
  includeInTotal: boolean;
  isArchived: boolean;
}

/** Net worth per currency across included, active accounts (no FX conversion in v1). */
export function totalsByCurrency(accounts: BalanceForTotal[]): Record<string, Minor> {
  const totals: Record<string, Minor> = {};
  for (const a of accounts) {
    if (!a.includeInTotal || a.isArchived) continue;
    totals[a.currency] = (totals[a.currency] ?? 0) + a.balance;
  }
  return totals;
}
