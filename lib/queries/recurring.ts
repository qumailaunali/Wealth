import "server-only";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { bigToMinor } from "@/lib/money";
import { dueOccurrences, type Frequency } from "@/lib/recurrence";

export interface RecurringView {
  id: string;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: number;
  toAmount: number | null;
  currency: string;
  title: string;
  note: string | null;
  frequency: Frequency;
  interval: number;
  startAt: string;
  nextRunAt: string;
  endsAt: string | null;
  isActive: boolean;
  account: { id: string; name: string };
  toAccount: { id: string; name: string } | null;
  category: { id: string; name: string; icon: string; color: string } | null;
}

export async function getRecurringRules(): Promise<RecurringView[]> {
  const user = await requireUser();
  const rules = await db.recurringRule.findMany({
    where: { userId: user.id },
    include: {
      account: { select: { id: true, name: true, currency: true } },
      toAccount: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
    orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }],
  });
  return rules.map((r) => ({
    id: r.id,
    type: r.type,
    amount: bigToMinor(r.amount),
    toAmount: r.toAmount === null ? null : bigToMinor(r.toAmount),
    currency: r.account.currency,
    title: r.title,
    note: r.note,
    frequency: r.frequency,
    interval: r.interval,
    startAt: r.startAt.toISOString(),
    nextRunAt: r.nextRunAt.toISOString(),
    endsAt: r.endsAt?.toISOString() ?? null,
    isActive: r.isActive,
    account: { id: r.account.id, name: r.account.name },
    toAccount: r.toAccount,
    category: r.category,
  }));
}

/**
 * Materialise due occurrences of the user's recurring rules into real transactions.
 * Called on app open (protected layout) and from the optional cron endpoint.
 * Each rule is advanced with an optimistic lock on `nextRunAt`, so concurrent requests
 * can't generate duplicates.
 */
export async function processDueRecurring(
  userId: string,
  zone: string,
  now = new Date(),
): Promise<number> {
  const rules = await db.recurringRule.findMany({
    where: { userId, isActive: true, nextRunAt: { lte: now } },
    take: 50,
  });
  let created = 0;
  for (const rule of rules) {
    const { dates, nextRunAt } = dueOccurrences(rule, now, zone);
    created += await db.$transaction(async (tx) => {
      const claimed = await tx.recurringRule.updateMany({
        where: { id: rule.id, userId, isActive: true, nextRunAt: rule.nextRunAt },
        data: nextRunAt
          ? { nextRunAt, lastRunAt: now }
          : { isActive: false, lastRunAt: now, nextRunAt: rule.nextRunAt },
      });
      if (claimed.count === 0 || dates.length === 0) return 0;
      await tx.transaction.createMany({
        data: dates.map((occurredAt) => ({
          userId,
          type: rule.type,
          amount: rule.amount,
          toAmount: rule.type === "TRANSFER" ? (rule.toAmount ?? rule.amount) : null,
          accountId: rule.accountId,
          toAccountId: rule.type === "TRANSFER" ? rule.toAccountId : null,
          categoryId: rule.type === "TRANSFER" ? null : rule.categoryId,
          title: rule.title,
          note: rule.note,
          occurredAt,
          recurringRuleId: rule.id,
        })),
      });
      return dates.length;
    });
  }
  return created;
}
