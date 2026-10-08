import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Route protection: unauthenticated users are redirected to /login, logged-in users away from it.
// Every page, server action and API route additionally re-checks the session in the data layer.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image|manifest.webmanifest|sw.js|swe-worker-.*|icons/|brand/|robots.txt).*)",
  ],
};
