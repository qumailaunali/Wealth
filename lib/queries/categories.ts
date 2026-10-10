import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { bigToMinor } from "@/lib/money";
import type { CategoryView } from "@/lib/types";

/** All of the user's categories (archived included), cached per request. */
const loadCategories = cache(async (userId: string): Promise<CategoryView[]> => {
  const rows = await db.category.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    parentId: c.parentId,
    monthlyBudget: c.monthlyBudget === null ? null : bigToMinor(c.monthlyBudget),
    isArchived: c.isArchived,
  }));
});

export async function getCategories(
  options: { includeArchived?: boolean } = {},
): Promise<CategoryView[]> {
  const user = await requireUser();
  const categories = await loadCategories(user.id);
  return options.includeArchived ? categories : categories.filter((c) => !c.isArchived);
}

/** Number of transactions per category (for delete/reassign decisions). */
export async function getCategoryUsage(): Promise<Record<string, number>> {
  const user = await requireUser();
  const rows = await db.transaction.groupBy({
    by: ["categoryId"],
    where: { userId: user.id, categoryId: { not: null } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.categoryId as string, r._count._all]));
}

export async function getTags(): Promise<string[]> {
  const user = await requireUser();
  const tags = await db.tag.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { name: true },
    take: 200,
  });
  return tags.map((t) => t.name);
}
