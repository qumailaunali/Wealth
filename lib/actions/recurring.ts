"use server";

import { assertAccountsOwned, assertCategoryOwned, requireUser } from "@/lib/dal";
import { parseDayInTz, parseLocalDateTime, endOfDayTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { processDueRecurring } from "@/lib/queries/recurring";
import { type ActionResult, idSchema, zodFail } from "@/lib/validators/common";
import { recurringSchema } from "@/lib/validators/finance";
import { fail, guard, ok, revalidateApp } from "./helpers";

export async function saveRecurringRule(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string; generated: number }>> {
  return guard(async () => {
    const user = await requireUser();
    const parsed = recurringSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const v = parsed.data;
    const isTransfer = v.type === "TRANSFER";

    const accounts = await assertAccountsOwned(
      user.id,
      isTransfer && v.toAccountId ? [v.accountId, v.toAccountId] : [v.accountId],
    );
    const from = accounts.find((a) => a.id === v.accountId)!;
    const to = isTransfer ? accounts.find((a) => a.id === v.toAccountId) : undefined;

    const amount = parseMoney(v.amount, from.currency);
    if (!amount || amount <= 0)
      return fail("Enter a valid amount", { amount: ["Enter a valid amount"] });
    let toAmount: number | null = null;
    if (to) {
      toAmount =
        to.currency === from.currency
          ? amount
          : v.toAmount
            ? parseMoney(v.toAmount, to.currency)
            : null;
      if (!toAmount || toAmount <= 0) {
        return fail(`Enter the amount received in ${to.currency}`, { toAmount: ["Required"] });
      }
    }
    let categoryId: string | null = null;
    if (!isTransfer && v.categoryId) {
      const c = await assertCategoryOwned(user.id, v.categoryId);
      if (c.type !== v.type) return fail("Category type doesn't match");
      categoryId = c.id;
    }
    const startAt = parseLocalDateTime(v.startAt, user.timezone);
    if (!startAt) return fail("Invalid start date");
    const endDay = v.endsAt ? parseDayInTz(v.endsAt, user.timezone) : null;
    const endsAt = endDay ? endOfDayTz(endDay, user.timezone) : null;
    if (endsAt && endsAt < startAt)
      return fail("End date must be after the start", { endsAt: ["Too early"] });

    const data = {
      type: v.type,
      amount: BigInt(amount),
      toAmount: toAmount === null ? null : BigInt(toAmount),
      accountId: from.id,
      toAccountId: to?.id ?? null,
      categoryId,
      title: v.title ?? "",
      note: v.note ?? null,
      frequency: v.frequency,
      interval: v.interval,
      startAt,
      endsAt,
      // Schedule restarts from the (possibly new) start date; past occurrences already
      // generated stay as normal transactions.
      nextRunAt: startAt,
      isActive: true,
    };

    let ruleId: string;
    if (id) {
      const existing = await db.recurringRule.findFirst({
        where: { id: idSchema.parse(id), userId: user.id },
        select: { id: true, startAt: true, nextRunAt: true },
      });
      if (!existing) return fail("Recurring rule not found");
      // Keep progress if the schedule anchor didn't change.
      const keepProgress = existing.startAt.getTime() === startAt.getTime();
      await db.recurringRule.update({
        where: { id: existing.id },
        data: { ...data, nextRunAt: keepProgress ? existing.nextRunAt : startAt },
      });
      ruleId = existing.id;
    } else {
      const created = await db.recurringRule.create({
        data: { ...data, userId: user.id },
        select: { id: true },
      });
      ruleId = created.id;
    }

    const generated = await processDueRecurring(user.id, user.timezone);
    revalidateApp();
    return ok({ id: ruleId, generated });
  });
}

export async function setRecurringActive(id: string, active: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const res = await db.recurringRule.updateMany({
    where: { id: idSchema.parse(id), userId: user.id },
    data: { isActive: active },
  });
  if (res.count === 0) return fail("Recurring rule not found");
  revalidateApp();
  return ok(undefined);
}

export async function deleteRecurringRule(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const res = await db.recurringRule.deleteMany({
    where: { id: idSchema.parse(id), userId: user.id },
  });
  if (res.count === 0) return fail("Recurring rule not found");
  revalidateApp();
  return ok(undefined);
}
