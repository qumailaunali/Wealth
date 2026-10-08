"use client";

import { Delete } from "lucide-react";
import type { KeypadKey } from "@/lib/keypad";
import { cn } from "@/lib/utils";

const KEYS: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

export function AmountKeypad({
  onKey,
  allowDecimal,
  decimalSymbol = ".",
}: {
  onKey: (key: KeypadKey) => void;
  allowDecimal: boolean;
  decimalSymbol?: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Amount keypad">
      {KEYS.map((key) => {
        const disabled = key === "." && !allowDecimal;
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => {
              onKey(key);
              if (typeof navigator !== "undefined" && "vibrate" in navigator)
                navigator.vibrate?.(5);
            }}
            onContextMenu={(e) => {
              if (key === "back") {
                e.preventDefault();
                onKey("clear");
              }
            }}
            aria-label={
              key === "back"
                ? "Delete digit (long-press to clear)"
                : key === "."
                  ? "Decimal point"
                  : key
            }
            className={cn(
              "num bg-surface-2 active:bg-surface-3 flex h-[52px] items-center justify-center rounded-2xl text-2xl font-semibold transition-colors select-none active:scale-[0.96] disabled:opacity-30",
              key === "back" && "text-muted-foreground",
            )}
          >
            {key === "back" ? (
              <Delete className="size-6" aria-hidden="true" />
            ) : key === "." ? (
              decimalSymbol
            ) : (
              key
            )}
          </button>
        );
      })}
    </div>
  );
}
