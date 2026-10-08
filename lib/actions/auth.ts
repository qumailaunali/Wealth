"use server";

import { AuthError } from "next-auth";
import { hashPassword, signIn, signOut } from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { clientIp, hit, isLimited, rateLimit } from "@/lib/rate-limit";
import { type ActionResult, zodFail } from "@/lib/validators/common";
import { Prisma } from "@/lib/generated/prisma/client";
import { loginSchema, registerSchema } from "@/lib/validators/auth";

async function signInWithCredentials(email: string, password: string): Promise<ActionResult> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof AuthError) {
      const code = (error as AuthError & { code?: string }).code;
      if (code === "rate_limited") {
        return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
      }
      return { ok: false, error: "Incorrect email or password." };
    }
    if (isDbUnavailable(error)) return UNAVAILABLE;
    throw error;
  }
}

const UNAVAILABLE: ActionResult = {
  ok: false,
  error: "We can't reach the server right now. Check your connection and try again.",
};

function isDbUnavailable(error: unknown): boolean {
  const cause =
    error instanceof Error && "cause" in error ? (error as { cause?: unknown }).cause : undefined;
  return [error, cause].some(
    (e) =>
      e instanceof Prisma.PrismaClientInitializationError ||
      (e instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1001", "P1002", "P1017", "P2024"].includes(e.code)) ||
      (e instanceof Error &&
        /Can't reach database server|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(e.message)),
  );
}

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const ip = await clientIp();
  const ipKey = `login-ip:${ip}`;
  if (isLimited(ipKey, 30)) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const res = await signInWithCredentials(parsed.data.email, parsed.data.password);
  if (!res.ok) hit(ipKey, 15 * 60_000);
  return res;
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const ip = await clientIp();
  // Looser in development so local testing (and the E2E suite) is not blocked.
  const registerLimit = process.env.NODE_ENV === "production" ? 5 : 100;
  if (!rateLimit(`register:${ip}`, registerLimit, 60 * 60_000).ok) {
    return { ok: false, error: "Too many sign-ups from this network. Try again later." };
  }
  const { name, email, password } = parsed.data;

  try {
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return {
        ok: false,
        error: "An account with this email already exists.",
        fieldErrors: { email: ["An account with this email already exists."] },
      };
    }

    const passwordHash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, passwordHash } });
      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, userId: user.id, sortOrder: i })),
      });
      await tx.account.create({
        data: {
          userId: user.id,
          name: "Cash",
          type: "CASH",
          currency: "PKR",
          color: "#10B981",
          icon: "banknote",
        },
      });
    });
  } catch (error) {
    if (isDbUnavailable(error)) return UNAVAILABLE;
    throw error;
  }

  return signInWithCredentials(email, password);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
