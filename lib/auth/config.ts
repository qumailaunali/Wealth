import type { NextAuthConfig } from "next-auth";

const AUTH_PAGES = ["/login", "/register"];
const PUBLIC_PATHS = ["/offline"];

/**
 * Edge-safe Auth.js config (no DB / bcrypt imports) shared by the proxy and the full auth instance.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user?.id);
      const path = nextUrl.pathname;
      if (AUTH_PAGES.some((p) => path.startsWith(p))) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      // API routes authenticate themselves and answer 401 instead of redirecting.
      if (path.startsWith("/api/")) return true;
      if (PUBLIC_PATHS.includes(path)) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.tv = (user as { tokenVersion?: number }).tokenVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      session.tokenVersion = typeof token.tv === "number" ? token.tv : 0;
      return session;
    },
  },
} satisfies NextAuthConfig;
