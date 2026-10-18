import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { bigToMinor } from "@/lib/money";
import type { CategoryView } from "@/lib/types";

/** All of the user's categories (archived included), cached across requests (see "categories" tag). */
const loadCategories = cache((userId: string): Promise<CategoryView[]> =>
  getCachedCategories(userId),
);

const getCachedCategories = unstable_cache(
  async (userId: string): Promise<CategoryView[]> => {
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
  },
  ["categories-data"],
  { tags: ["categories"] },
);

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

/**
 * Most-used expense categories over the last 90 days (by transaction count, so
 * mixed currencies don't skew it). Sub-categories roll up into their parent,
 * matching how the categoryId filter includes children.
 */
export async function getTopExpenseCategoryIds(limit = 8): Promise<string[]> {
  const user = await requireUser();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [rows, categories] = await Promise.all([
    db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: user.id,
        type: "EXPENSE",
        categoryId: { not: null },
        occurredAt: { gte: since },
      },
      _count: { _all: true },
    }),
    loadCategories(user.id),
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const counts = new Map<string, number>();
  for (const r of rows) {
    const cat = byId.get(r.categoryId as string);
    if (!cat) continue;
    const parent = cat.parentId ? byId.get(cat.parentId) : undefined;
    const root = parent ?? cat;
    if (root.isArchived || root.type !== "EXPENSE") continue;
    counts.set(root.id, (counts.get(root.id) ?? 0) + r._count._all);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

export async function getTags(): Promise<string[]> {
  const user = await requireUser();
  const tags = await getCachedTags(user.id);
  return tags;
}

/** Tag names, cached across requests (see "tags" tag). */
const getCachedTags = unstable_cache(
  async (userId: string): Promise<string[]> => {
    const tags = await db.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { name: true },
      take: 200,
    });
    return tags.map((t) => t.name);
  },
  ["tags-data"],
  { tags: ["tags"] },
);
