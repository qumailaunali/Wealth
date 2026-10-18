/**
 * Central data-access guard. Every query and server action obtains the current user from here,
 * and every Prisma call is scoped by that user's id. Ownership of referenced records
 * (accounts, categories, …) is verified through the helpers below — never trust client ids.
 */
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Weekday } from "@/lib/dates";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  defaultCurrency: string;
  locale: string;
  weekStart: Weekday;
  timezone: string;
  theme: "dark" | "light";
  /** Exchange rates to the default currency: { USD: 278.5 }. */
  fxRates: Record<string, number>;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  // The user row is cached across requests (see getCachedUserRow) so every page
  // load doesn't pay a database round trip just to read preferences.
  const user = await getCachedUserRow(id);
  // Deleted users and sessions issued before a password change are rejected.
  if (!user || user.tokenVersion !== (session.tokenVersion ?? 0)) return null;
  const { tokenVersion: _tv, ...rest } = user;
  return {
    ...rest,
    weekStart: (user.weekStart % 7) as Weekday,
    theme: user.theme === "light" ? "light" : "dark",
    fxRates: await getCachedFxRates(id),
  };
});

/**
 * The user's own row, cached in the Data Cache across requests. Profile and preference
 * changes are rare, but this row was previously re-read from the database on every single
 * page load and API call — a full round trip each time.
 */
const getCachedUserRow = unstable_cache(
  async (id: string) => {
    return db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        defaultCurrency: true,
        locale: true,
        weekStart: true,
        timezone: true,
        theme: true,
        tokenVersion: true,
      },
    });
  },
  ["dal-user-row"],
  { tags: ["user"], revalidate: 3600 },
);

/** Drop the cached user row — call after profile, preference, or password changes. */
export function revalidateUserCache() {
  revalidateTag("user", "default");
}

/**
 * The user's FX rates, cached separately from the user row. Reads are wrapped so a
 * deployment that ships before `prisma migrate deploy` adds the column keeps working
 * (rates just read as empty until the migration runs).
 */
const getCachedFxRates = unstable_cache(
  async (id: string): Promise<Record<string, number>> => {
    try {
      const row = await db.user.findUnique({ where: { id }, select: { fxRates: true } });
      const v = row?.fxRates;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const out: Record<string, number> = {};
        for (const [k, rate] of Object.entries(v as Record<string, unknown>)) {
          if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) out[k] = rate;
        }
        return out;
      }
      return {};
    } catch {
      return {};
    }
  },
  ["dal-fx-rates"],
  { tags: ["user"], revalidate: 60 },
);

/** For pages and server actions: redirects to /login when there is no valid session. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class NotFoundError extends Error {
  constructor(what = "Record") {
    super(`${what} not found`);
  }
}

/** Throws unless every given account id belongs to the user. Returns the accounts. */
export async function assertAccountsOwned(userId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  const accounts = await db.account.findMany({
    where: { userId, id: { in: unique } },
    select: { id: true, currency: true, isArchived: true, name: true },
  });
  if (accounts.length !== unique.length) throw new NotFoundError("Account");
  return accounts;
}

export async function assertCategoryOwned(userId: string, id: string) {
  const category = await db.category.findFirst({
    where: { id, userId },
    select: { id: true, type: true, parentId: true, isArchived: true },
  });
  if (!category) throw new NotFoundError("Category");
  return category;
}
