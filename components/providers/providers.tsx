"use client";

import { Toaster } from "@/components/ui/sonner";
import { PwaProvider } from "./pwa-provider";

/** Root providers: kept minimal so the auth pages ship as little JS as possible. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PwaProvider>
      {children}
      <Toaster />
    </PwaProvider>
  );
}
