/**
 * Central data-access guard. Every query and server action obtains the current user from here,
 * and every Prisma call is scoped by that user's id. Ownership of referenced records
 * (accounts, categories, …) is verified through the helpers below — never trust client ids.
 */
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
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
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
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
  // Deleted users and sessions issued before a password change are rejected.
  if (!user || user.tokenVersion !== (session.tokenVersion ?? 0)) return null;
  const { tokenVersion: _tv, ...rest } = user;
  return {
    ...rest,
    weekStart: (user.weekStart % 7) as Weekday,
    theme: user.theme === "light" ? "light" : "dark",
  };
});

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
