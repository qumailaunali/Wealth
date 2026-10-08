"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Tailwind classes applied to the active segment */
  activeClassName?: string;
}

/** Accessible radio-group style segmented control. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "bg-surface-2 grid auto-cols-fr grid-flow-col gap-1 rounded-2xl p-1",
        className,
      )}
      onKeyDown={(e) => {
        const idx = options.findIndex((o) => o.value === value);
        const next = e.key === "ArrowRight" ? idx + 1 : e.key === "ArrowLeft" ? idx - 1 : null;
        if (next === null) return;
        e.preventDefault();
        const opt = options[(next + options.length) % options.length];
        if (opt) onChange(opt.value);
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn(
              "text-muted-foreground rounded-xl font-semibold transition-all",
              size === "sm" ? "h-9 text-xs" : "h-10 text-sm",
              active && (opt.activeClassName ?? "bg-card text-foreground shadow-sm"),
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
