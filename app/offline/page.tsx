import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Offline" };

/** Branded fallback served by the service worker when a page isn't cached and the network is down. */
export default function OfflinePage() {
  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div
        aria-hidden="true"
        className="bg-primary/15 pointer-events-none absolute inset-x-0 top-0 mx-auto h-72 max-w-md rounded-full blur-[100px]"
      />
      <LogoMark size={72} className="relative mb-6" />
      <h1 className="relative text-2xl font-bold tracking-tight">You&apos;re offline</h1>
      <p className="text-muted-foreground relative mt-2 max-w-xs text-sm">
        This page isn&apos;t saved on your device yet. Pages you&apos;ve opened before still work,
        and anything you add offline syncs when you reconnect.
      </p>
      <RetryButton />
    </main>
  );
}
