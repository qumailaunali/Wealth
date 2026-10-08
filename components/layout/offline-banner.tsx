"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { usePwa } from "@/components/providers/pwa-provider";

export function OfflineBanner() {
  const { online, pendingCount, syncNow } = usePwa();
  if (online && pendingCount === 0) return null;
  return (
    <div
      role="status"
      className="bg-warning/15 text-warning sticky top-0 z-30 flex items-center justify-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5 text-center text-xs font-medium backdrop-blur"
    >
      {online ? (
        <>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {pendingCount} offline transaction{pendingCount === 1 ? "" : "s"} waiting to sync
          <button
            type="button"
            onClick={() => void syncNow()}
            className="ml-1 underline underline-offset-2"
          >
            Sync now
          </button>
        </>
      ) : (
        <>
          <CloudOff className="size-3.5" aria-hidden="true" />
          You&apos;re offline. Showing saved data
          {pendingCount ? ` · ${pendingCount} waiting to sync` : ""}.
        </>
      )}
    </div>
  );
}
