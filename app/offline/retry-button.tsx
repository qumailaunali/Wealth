"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    <Button className="relative mt-6" onClick={() => window.location.reload()}>
      <RefreshCw aria-hidden="true" /> Try again
    </Button>
  );
}
