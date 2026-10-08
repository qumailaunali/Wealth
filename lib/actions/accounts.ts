"use server";

import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { type ActionResult, idSchema, zodFail } from "@/lib/validators/common";
import { accountSchema } from "@/lib/validators/finance";
import { fail, guard, ok, revalidateApp } from "./helpers";

function parseAccount(input: unknown) {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { error: zodFail(parsed.error) } as const;
  const opening = parseMoney(parsed.data.openingBalance || "0", parsed.data.currency);
  if (opening === null) {
    return {
      error: fail("Opening balance has too many decimals", {
        openingBalance: ["Too many decimal places for this currency"],
      }),
    } as const;
  }
  return {
    data: { ...parsed.data, openingBalance: BigInt(opening), note: parsed.data.note ?? null },
  } as const;
}

export async function createAccount(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = parseAccount(input);
  if (result.error) return result.error;
  const count = await db.account.count({ where: { userId: user.id } });
  if (count >= 100) return fail("You can have at most 100 accounts.");
  const account = await db.account.create({
    data: { ...result.data, userId: user.id, sortOrder: count },
    select: { id: true },
  });
  revalidateApp();
  return ok(account);
}

export async function updateAccount(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const user = await requireUser();
    const accountId = idSchema.parse(id);
    const result = parseAccount(input);
    if (result.error) return result.error;

    const existing = await db.account.findFirst({ where: { id: accountId, userId: user.id } });
    if (!existing) return fail("Account not found");
    if (existing.currency !== result.data.currency) {
      const used = await db.transaction.count({
        where: { userId: user.id, OR: [{ accountId }, { toAccountId: accountId }] },
      });
      if (used > 0) {
        return fail("Currency can't be changed once an account has transactions.", {
          currency: ["Currency is locked because this account has transactions"],
        });
      }
    }
    await db.account.update({ where: { id: existing.id }, data: result.data });
    revalidateApp();
    return ok({ id: existing.id });
  });
}

export async function setAccountArchived(id: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const res = await db.account.updateMany({
    where: { id: idSchema.parse(id), userId: user.id },
    data: { isArchived: archived },
  });
  if (res.count === 0) return fail("Account not found");
  revalidateApp();
  return ok(undefined);
}

/**
 * Delete an account. If it has transactions, the caller must pass `force: true`
 * (after the user confirmed); those transactions are deleted too. Archive is the safer alternative.
 */
export async function deleteAccount(
  id: string,
  force = false,
): Promise<ActionResult<{ needsConfirm?: number }>> {
  const user = await requireUser();
  const accountId = idSchema.parse(id);
  const account = await db.account.findFirst({
    where: { id: accountId, userId: user.id },
    select: { id: true },
  });
  if (!account) return fail("Account not found");
  const txCount = await db.transaction.count({
    where: { userId: user.id, OR: [{ accountId }, { toAccountId: accountId }] },
  });
  if (txCount > 0 && !force) return ok({ needsConfirm: txCount });
  await db.account.delete({ where: { id: account.id } });
  revalidateApp();
  return ok({});
}
