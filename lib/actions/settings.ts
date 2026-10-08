"use server";

import { cookies } from "next/headers";
import { hashPassword, signOut, verifyPassword } from "@/lib/auth";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { changePasswordSchema } from "@/lib/validators/auth";
import { type ActionResult, zodFail } from "@/lib/validators/common";
import { deleteAccountSchema, preferencesSchema, profileSchema } from "@/lib/validators/finance";
import { fail, ok, revalidateApp } from "./helpers";

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  if (parsed.data.email !== user.email) {
    const taken = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (taken)
      return fail("That email is already in use", { email: ["That email is already in use"] });
  }
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidateApp();
  return ok(undefined);
}

export async function updatePreferences(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  // Mirror the theme in a cookie so the root layout can render it without a flash.
  (await cookies()).set("theme", parsed.data.theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidateApp();
  return ok(undefined);
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  if (!rateLimit(`pw:${user.id}:${await clientIp()}`, 5, 15 * 60_000).ok) {
    return fail("Too many attempts. Try again later.");
  }
  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return fail("Current password is incorrect", {
      currentPassword: ["Current password is incorrect"],
    });
  }
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      tokenVersion: { increment: 1 },
    },
  });
  // All sessions (including this one) are now invalid; send the user to sign in again.
  await signOut({ redirectTo: "/login?reason=password-changed" });
  return ok(undefined);
}

export async function deleteUserAccount(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(parsed.data.password, row.passwordHash))) {
    return fail("Password is incorrect", { password: ["Password is incorrect"] });
  }
  await db.user.delete({ where: { id: user.id } });
  await signOut({ redirectTo: "/register" });
  return ok(undefined);
}
