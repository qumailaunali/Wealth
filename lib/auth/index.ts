import "server-only";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { hit, isLimited, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators/auth";
import { authConfig } from "./config";

class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

// A real bcrypt hash used to keep timing constant when the email doesn't exist.
const DUMMY_HASH = "$2b$12$toH1itSj/n9wYS6gox8U6eWszAL.KVq3u01HdZTIRiwEShcpZxFlK";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Only failed attempts count; a successful sign-in clears the counter.
        const key = `login:${email}`;
        if (isLimited(key, 8)) throw new RateLimitedError();

        const user = await db.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, passwordHash: true, tokenVersion: true },
        });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) {
          hit(key, 15 * 60_000);
          return null;
        }
        resetRateLimit(key);
        return { id: user.id, name: user.name, email: user.email, tokenVersion: user.tokenVersion };
      },
    }),
  ],
});

export const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
