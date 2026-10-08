"use server";

import { assertAccountsOwned, assertCategoryOwned, type CurrentUser, requireUser } from "@/lib/dal";
import { parseLocalDateTime, toLocalDateTimeInput } from "@/lib/dates";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { bigToMinor, parseMoney, toInputString } from "@/lib/money";
import { type ActionFailure, type ActionResult, idSchema, zodFail } from "@/lib/validators/common";
import { type TransactionInput, transactionSchema } from "@/lib/validators/finance";
import { fail, guard, ok, revalidateApp } from "./helpers";

type Resolved = {
  data: Omit<Prisma.TransactionUncheckedCreateInput, "userId">;
  tags: string[];
};

/** Validate input and verify that every referenced record belongs to the user. */
async function resolveTransaction(
  user: CurrentUser,
  input: unknown,
): Promise<{ error: ActionFailure } | { value: Resolved }> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { error: zodFail(parsed.error) };
  const v = parsed.data;
  const isTransfer = v.type === "TRANSFER";

  const accountIds = isTransfer && v.toAccountId ? [v.accountId, v.toAccountId] : [v.accountId];
  const accounts = await assertAccountsOwned(user.id, accountIds);
  const from = accounts.find((a) => a.id === v.accountId)!;
  const to = isTransfer ? accounts.find((a) => a.id === v.toAccountId) : undefined;

  const amount = parseMoney(v.amount, from.currency);
  if (amount === null || amount <= 0) {
    return {
      error: fail("Enter a valid amount", { amount: ["Enter an amount greater than zero"] }),
    };
  }

  let toAmount: number | null = null;
  if (isTransfer && to) {
    if (to.currency === from.currency) toAmount = amount;
    else {
      toAmount = v.toAmount ? parseMoney(v.toAmount, to.currency) : null;
      if (toAmount === null || toAmount <= 0) {
        return {
          error: fail(`Enter the amount received in ${to.currency}`, {
            toAmount: [`Enter the amount received in ${to.currency}`],
          }),
        };
      }
    }
  }

  let categoryId: string | null = null;
  if (!isTransfer && v.categoryId) {
    const category = await assertCategoryOwned(user.id, v.categoryId);
    if (category.type !== v.type) {
      return {
        error: fail("Category type doesn't match", { categoryId: ["Pick a matching category"] }),
      };
    }
    categoryId = category.id;
  }

  const occurredAt = parseLocalDateTime(v.occurredAt, user.timezone);
  if (!occurredAt) return { error: fail("Invalid date", { occurredAt: ["Invalid date"] }) };

  return {
    value: {
      data: {
        type: v.type,
        amount: BigInt(amount),
        toAmount: toAmount === null ? null : BigInt(toAmount),
        accountId: from.id,
        toAccountId: to?.id ?? null,
        categoryId,
        title: v.title ?? "",
        note: v.note ?? null,
        occurredAt,
        receiptUrl: v.receiptUrl || null,
        clientId: v.clientId ?? null,
      },
      tags: [...new Set(v.tags.map((t) => t.toLowerCase()))],
    },
  };
}

async function tagConnections(tx: Prisma.TransactionClient, userId: string, names: string[]) {
  if (!names.length) return [];
  await tx.tag.createMany({ data: names.map((name) => ({ userId, name })), skipDuplicates: true });
  const tags = await tx.tag.findMany({
    where: { userId, name: { in: names } },
    select: { id: true },
  });
  return tags.map((t) => ({ tagId: t.id }));
}

export async function createTransaction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const user = await requireUser();
    const resolved = await resolveTransaction(user, input);
    if ("error" in resolved) return resolved.error;
    const { data, tags } = resolved.value;

    // Idempotency: a replayed offline submission returns the already-created row.
    if (data.clientId) {
      const existing = await db.transaction.findFirst({
        where: { userId: user.id, clientId: data.clientId },
        select: { id: true },
      });
      if (existing) return ok(existing);
    }

    const created = await db.$transaction(async (tx) => {
      const links = await tagConnections(tx, user.id, tags);
      return tx.transaction.create({
        data: { ...data, userId: user.id, tags: { create: links } },
        select: { id: true },
      });
    });
    revalidateApp();
    return ok(created);
  });
}

export async function updateTransaction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const user = await requireUser();
    const txId = idSchema.parse(id);
    const existing = await db.transaction.findFirst({
      where: { id: txId, userId: user.id },
      select: { id: true },
    });
    if (!existing) return fail("Transaction not found");
    const resolved = await resolveTransaction(user, input);
    if ("error" in resolved) return resolved.error;
    const { data, tags } = resolved.value;
    const { clientId: _ignored, ...updateData } = data;

    await db.$transaction(async (tx) => {
      const links = await tagConnections(tx, user.id, tags);
      await tx.transactionTag.deleteMany({ where: { transactionId: existing.id } });
      await tx.transaction.update({
        where: { id: existing.id },
        data: { ...updateData, tags: { create: links } },
      });
    });
    revalidateApp();
    return ok({ id: existing.id });
  });
}

/** Deletes a transaction and returns the input needed to restore it (for the undo toast). */
export async function deleteTransaction(
  id: string,
): Promise<ActionResult<{ restore: TransactionInput }>> {
  const user = await requireUser();
  const row = await db.transaction.findFirst({
    where: { id: idSchema.parse(id), userId: user.id },
    include: {
      account: { select: { currency: true } },
      toAccount: { select: { currency: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  if (!row) return fail("Transaction not found");
  await db.transaction.delete({ where: { id: row.id } });
  revalidateApp();
  return ok({
    restore: {
      type: row.type,
      amount: toInputString(bigToMinor(row.amount), row.account.currency),
      toAmount:
        row.toAmount !== null && row.toAccount
          ? toInputString(bigToMinor(row.toAmount), row.toAccount.currency)
          : "",
      accountId: row.accountId,
      toAccountId: row.toAccountId,
      categoryId: row.categoryId,
      title: row.title,
      note: row.note ?? undefined,
      occurredAt: toLocalDateTimeInput(row.occurredAt, user.timezone),
      tags: row.tags.map((t) => t.tag.name),
      receiptUrl: row.receiptUrl ?? "",
    },
  });
}
