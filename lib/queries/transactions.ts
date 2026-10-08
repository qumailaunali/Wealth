import "server-only";
import { PAGE_SIZE } from "@/lib/constants";
import { type CurrentUser, requireUser } from "@/lib/dal";
import { dayKey, endOfDayTz, parseDayInTz, startOfDayTz } from "@/lib/dates";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { bigToMinor, parseMoney } from "@/lib/money";
import type { TransactionPage, TransactionView } from "@/lib/types";
import type { TransactionFilters } from "@/lib/validators/finance";

export const transactionInclude = {
  account: { select: { id: true, name: true, color: true, icon: true, currency: true } },
  toAccount: { select: { id: true, name: true, color: true, icon: true, currency: true } },
  category: { select: { id: true, name: true, color: true, icon: true } },
  tags: { select: { tag: { select: { name: true } } } },
} satisfies Prisma.TransactionInclude;

type TxRow = Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>;

export function toTransactionView(t: TxRow): TransactionView {
  const { currency, ...account } = t.account;
  return {
    id: t.id,
    type: t.type,
    amount: bigToMinor(t.amount),
    toAmount: t.toAmount === null ? null : bigToMinor(t.toAmount),
    currency,
    toCurrency: t.toAccount?.currency ?? null,
    occurredAt: t.occurredAt.toISOString(),
    title: t.title,
    note: t.note,
    receiptUrl: t.receiptUrl,
    recurringRuleId: t.recurringRuleId,
    account,
    toAccount: t.toAccount
      ? {
          id: t.toAccount.id,
          name: t.toAccount.name,
          color: t.toAccount.color,
          icon: t.toAccount.icon,
        }
      : null,
    category: t.category,
    tags: t.tags.map((x) => x.tag.name),
  };
}

/** Build a user-scoped where clause from list/export filters. */
export async function buildTransactionWhere(
  user: CurrentUser,
  filters: TransactionFilters,
): Promise<Prisma.TransactionWhereInput> {
  const and: Prisma.TransactionWhereInput[] = [{ userId: user.id }];

  if (filters.type) and.push({ type: filters.type });
  if (filters.accountId) {
    and.push({ OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }] });
  }
  if (filters.categoryId) {
    // Include sub-categories of the selected category (scoped to the user).
    const children = await db.category.findMany({
      where: { userId: user.id, parentId: filters.categoryId },
      select: { id: true },
    });
    and.push({ categoryId: { in: [filters.categoryId, ...children.map((c) => c.id)] } });
  }
  const from = filters.from ? parseDayInTz(filters.from, user.timezone) : null;
  const to = filters.to ? parseDayInTz(filters.to, user.timezone) : null;
  if (from || to) {
    and.push({
      occurredAt: {
        ...(from ? { gte: startOfDayTz(from, user.timezone) } : {}),
        ...(to ? { lte: endOfDayTz(to, user.timezone) } : {}),
      },
    });
  }
  // Amount filters are interpreted in the user's default currency precision.
  const min = filters.min ? parseMoney(filters.min, user.defaultCurrency) : null;
  const max = filters.max ? parseMoney(filters.max, user.defaultCurrency) : null;
  if (min !== null || max !== null) {
    and.push({
      amount: {
        ...(min !== null ? { gte: BigInt(min) } : {}),
        ...(max !== null ? { lte: BigInt(max) } : {}),
      },
    });
  }
  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { note: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }
  return { AND: and };
}

export async function listTransactions(
  filters: TransactionFilters,
  cursor?: string | null,
  take = PAGE_SIZE,
): Promise<TransactionPage> {
  const user = await requireUser();
  const where = await buildTransactionWhere(user, filters);

  let cursorClause: Prisma.TransactionWhereInput | undefined;
  if (cursor) {
    const anchor = await db.transaction.findFirst({
      where: { id: cursor, userId: user.id },
      select: { id: true, occurredAt: true },
    });
    if (anchor) {
      cursorClause = {
        OR: [
          { occurredAt: { lt: anchor.occurredAt } },
          { occurredAt: anchor.occurredAt, id: { lt: anchor.id } },
        ],
      };
    }
  }

  const rows = await db.transaction.findMany({
    where: cursorClause ? { AND: [where, cursorClause] } : where,
    include: transactionInclude,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: take + 1,
  });

  const hasMore = rows.length > take;
  const pageRows = hasMore ? rows.slice(0, take) : rows;
  const items = pageRows.map(toTransactionView);

  // Accurate daily totals for every day touched by this page (not just the loaded rows).
  const dayTotals: TransactionPage["dayTotals"] = {};
  const first = pageRows[0];
  const last = pageRows[pageRows.length - 1];
  if (first && last) {
    const sums = await db.transaction.findMany({
      where: {
        AND: [
          where,
          { type: { in: ["INCOME", "EXPENSE"] } },
          { account: { currency: user.defaultCurrency } },
          {
            occurredAt: {
              gte: startOfDayTz(last.occurredAt, user.timezone),
              lte: endOfDayTz(first.occurredAt, user.timezone),
            },
          },
        ],
      },
      select: { type: true, amount: true, occurredAt: true },
    });
    for (const s of sums) {
      const key = dayKey(s.occurredAt, user.timezone);
      const t = (dayTotals[key] ??= { income: 0, expense: 0 });
      if (s.type === "INCOME") t.income += bigToMinor(s.amount);
      else t.expense += bigToMinor(s.amount);
    }
  }

  return {
    items,
    nextCursor: hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null,
    dayTotals,
  };
}

export async function getRecentTransactions(take = 6): Promise<TransactionView[]> {
  const user = await requireUser();
  const rows = await db.transaction.findMany({
    where: { userId: user.id },
    include: transactionInclude,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take,
  });
  return rows.map(toTransactionView);
}

export async function getTransaction(id: string): Promise<TransactionView | null> {
  const user = await requireUser();
  const row = await db.transaction.findFirst({
    where: { id, userId: user.id },
    include: transactionInclude,
  });
  return row ? toTransactionView(row) : null;
}
