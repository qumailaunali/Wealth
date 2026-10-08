"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePwa } from "@/components/providers/pwa-provider";
import { Button } from "@/components/ui/button";

/**
 * Mobile-only "Install app" call to action for the auth pages.
 * Uses the native prompt where available (Android/Chrome) and falls back to
 * Add-to-Home-Screen steps on iOS. Hidden once the app is running installed.
 */
export function InstallAppButton() {
  const { canInstall, isStandalone, isIos, promptInstall } = usePwa();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (isStandalone || (!canInstall && !isIos)) return null;

  return (
    <div className="mt-4 md:hidden">
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        aria-expanded={!canInstall ? showIosSteps : undefined}
        onClick={async () => {
          if (canInstall) {
            if (await promptInstall()) toast.success("Installing Wealth…");
          } else {
            setShowIosSteps((v) => !v);
          }
        }}
      >
        <Download aria-hidden="true" /> Install app
      </Button>

      {!canInstall && showIosSteps ? (
        <ol className="bg-card/80 mt-3 grid grid-cols-1 gap-3 rounded-2xl border p-4 text-sm backdrop-blur-xl">
          <li className="flex items-center gap-3">
            <span className="bg-surface-2 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Share className="size-4" aria-hidden="true" />
            </span>
            <span>
              In Safari, tap the <strong>Share</strong> button.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="bg-surface-2 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <SquarePlus className="size-4" aria-hidden="true" />
            </span>
            <span>
              Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
            </span>
          </li>
        </ol>
      ) : null}
    </div>
  );
}
