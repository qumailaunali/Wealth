import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
    tokenVersion: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    tv?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    tv?: number;
  }
}
