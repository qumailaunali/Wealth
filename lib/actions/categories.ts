"use server";

import { assertCategoryOwned, requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { type ActionResult, idSchema, zodFail } from "@/lib/validators/common";
import { categorySchema, deleteCategorySchema } from "@/lib/validators/finance";
import { fail, guard, ok, revalidateApp } from "./helpers";

async function parseCategory(userId: string, currency: string, input: unknown, selfId?: string) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: zodFail(parsed.error) } as const;
  const { monthlyBudget, parentId, ...rest } = parsed.data;

  let budget: bigint | null = null;
  if (monthlyBudget && rest.type === "EXPENSE") {
    const minor = parseMoney(monthlyBudget, currency);
    if (minor === null)
      return { error: fail("Invalid budget", { monthlyBudget: ["Invalid amount"] }) } as const;
    budget = minor > 0 ? BigInt(minor) : null;
  }

  if (parentId) {
    if (parentId === selfId) return { error: fail("A category can't be its own parent") } as const;
    const parent = await assertCategoryOwned(userId, parentId);
    if (parent.parentId)
      return { error: fail("Sub-categories can only be one level deep") } as const;
    if (parent.type !== rest.type) return { error: fail("Parent must be the same type") } as const;
    if (selfId) {
      const hasChildren = await db.category.count({ where: { userId, parentId: selfId } });
      if (hasChildren)
        return { error: fail("This category has sub-categories, so it can't become one") } as const;
    }
  }
  return { data: { ...rest, parentId: parentId ?? null, monthlyBudget: budget } } as const;
}

export async function createCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const user = await requireUser();
    const result = await parseCategory(user.id, user.defaultCurrency, input);
    if (result.error) return result.error;
    const count = await db.category.count({ where: { userId: user.id } });
    if (count >= 300) return fail("Category limit reached.");
    const category = await db.category.create({
      data: { ...result.data, userId: user.id, sortOrder: count },
      select: { id: true },
    });
    revalidateApp();
    return ok(category);
  });
}

export async function updateCategory(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const user = await requireUser();
    const existing = await assertCategoryOwned(user.id, idSchema.parse(id));
    const result = await parseCategory(user.id, user.defaultCurrency, input, existing.id);
    if (result.error) return result.error;
    if (result.data.type !== existing.type) {
      const used = await db.transaction.count({
        where: { userId: user.id, categoryId: existing.id },
      });
      if (used) return fail("Type can't be changed while transactions use this category.");
    }
    await db.category.update({ where: { id: existing.id }, data: result.data });
    revalidateApp();
    return ok({ id: existing.id });
  });
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const res = await db.category.updateMany({
    where: { id: idSchema.parse(id), userId: user.id },
    data: { isArchived: archived },
  });
  if (res.count === 0) return fail("Category not found");
  revalidateApp();
  return ok(undefined);
}

/**
 * Delete a category. When transactions (or recurring rules) use it, `reassignTo` is required
 * and everything is moved inside one DB transaction. Sub-categories are promoted to top level.
 */
export async function deleteCategory(
  input: unknown,
): Promise<ActionResult<{ needsReassign?: number }>> {
  return guard(async () => {
    const user = await requireUser();
    const parsed = deleteCategorySchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const category = await assertCategoryOwned(user.id, parsed.data.id);
    const used = await db.transaction.count({
      where: { userId: user.id, categoryId: category.id },
    });

    if (used > 0 && !parsed.data.reassignTo) return ok({ needsReassign: used });

    let target: string | null = null;
    if (parsed.data.reassignTo) {
      if (parsed.data.reassignTo === category.id) return fail("Pick a different category");
      const t = await assertCategoryOwned(user.id, parsed.data.reassignTo);
      if (t.type !== category.type) return fail("Reassign to a category of the same type");
      target = t.id;
    }

    await db.$transaction([
      ...(target
        ? [
            db.transaction.updateMany({
              where: { userId: user.id, categoryId: category.id },
              data: { categoryId: target },
            }),
            db.recurringRule.updateMany({
              where: { userId: user.id, categoryId: category.id },
              data: { categoryId: target },
            }),
          ]
        : []),
      db.category.updateMany({
        where: { userId: user.id, parentId: category.id },
        data: { parentId: null },
      }),
      db.category.delete({ where: { id: category.id } }),
    ]);
    revalidateApp();
    return ok({});
  });
}
