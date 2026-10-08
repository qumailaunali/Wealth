"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <EmptyState
      icon={TriangleAlert}
      title={offline ? "You're offline" : "Something went wrong"}
      description={
        offline
          ? "This page isn't available offline yet. Reconnect and try again."
          : "We couldn't load this page. Your data is safe. Please try again."
      }
      action={
        <Button onClick={reset}>
          <RefreshCw aria-hidden="true" /> Try again
        </Button>
      }
      className="py-24"
    />
  );
}
