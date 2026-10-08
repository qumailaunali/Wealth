import "server-only";
import { computeBalance, EMPTY_FLOWS, totalsByCurrency, type AccountFlows } from "@/lib/balance";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { bigToMinor } from "@/lib/money";
import type { AccountView } from "@/lib/types";

/** Per-account ledger flows, aggregated in the database. */
async function getFlows(userId: string, accountIds?: string[]): Promise<Map<string, AccountFlows>> {
  const scope = accountIds ? { in: accountIds } : undefined;
  const [outgoing, incoming] = await Promise.all([
    db.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, ...(scope ? { accountId: scope } : {}) },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["toAccountId"],
      where: { userId, type: "TRANSFER", toAccountId: scope ?? { not: null } },
      _sum: { toAmount: true },
    }),
  ]);

  const flows = new Map<string, AccountFlows>();
  const get = (id: string) => {
    let f = flows.get(id);
    if (!f) flows.set(id, (f = { ...EMPTY_FLOWS }));
    return f;
  };
  for (const row of outgoing) {
    const sum = bigToMinor(row._sum.amount);
    const f = get(row.accountId);
    if (row.type === "INCOME") f.income += sum;
    else if (row.type === "EXPENSE") f.expense += sum;
    else f.transferOut += sum;
  }
  for (const row of incoming) {
    if (row.toAccountId) get(row.toAccountId).transferIn += bigToMinor(row._sum.toAmount);
  }
  return flows;
}

export async function getAccounts(
  options: { includeArchived?: boolean } = {},
): Promise<AccountView[]> {
  const user = await requireUser();
  const [accounts, flows] = await Promise.all([
    db.account.findMany({
      where: { userId: user.id, ...(options.includeArchived ? {} : { isArchived: false }) },
      orderBy: [{ isArchived: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getFlows(user.id),
  ]);
  return accounts.map((a) => {
    const opening = bigToMinor(a.openingBalance);
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
      openingBalance: opening,
      balance: computeBalance(opening, flows.get(a.id)),
      color: a.color,
      icon: a.icon,
      includeInTotal: a.includeInTotal,
      isArchived: a.isArchived,
      note: a.note,
    };
  });
}

export async function getAccount(id: string) {
  const user = await requireUser();
  const account = await db.account.findFirst({ where: { id, userId: user.id } });
  if (!account) return null;
  const [flows, txCount] = await Promise.all([
    getFlows(user.id, [id]),
    db.transaction.count({
      where: { userId: user.id, OR: [{ accountId: id }, { toAccountId: id }] },
    }),
  ]);
  const opening = bigToMinor(account.openingBalance);
  const view: AccountView = {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    openingBalance: opening,
    balance: computeBalance(opening, flows.get(id)),
    color: account.color,
    icon: account.icon,
    includeInTotal: account.includeInTotal,
    isArchived: account.isArchived,
    note: account.note,
  };
  return { account: view, txCount, flows: flows.get(id) ?? EMPTY_FLOWS };
}

export function netWorth(accounts: AccountView[]) {
  return totalsByCurrency(accounts);
}
