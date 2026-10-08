"use client";

import { Check } from "lucide-react";
import { AppIcon, ICON_NAMES } from "@/components/app-icon";
import { COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ColorPicker({
  value,
  onChange,
  label = "Colour",
}: {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-8 gap-2">
      {COLORS.map((c) => {
        const selected = c.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c}
            onClick={() => onChange(c)}
            className={cn(
              "pressable ring-offset-card flex aspect-square min-h-9 items-center justify-center rounded-full ring-offset-2 transition",
              selected && "ring-foreground ring-2",
            )}
            style={{ backgroundColor: c }}
          >
            {selected ? (
              <Check className="size-4 text-white drop-shadow" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
  color,
  label = "Icon",
}: {
  value: string;
  onChange: (icon: string) => void;
  color: string;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid max-h-44 grid-cols-7 gap-2 overflow-y-auto p-0.5"
    >
      {ICON_NAMES.map((name) => {
        const selected = name === value;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name.replace(/-/g, " ")}
            onClick={() => onChange(name)}
            className={cn(
              "pressable bg-surface-2 text-muted-foreground flex aspect-square min-h-10 items-center justify-center rounded-xl transition-colors",
              selected && "text-foreground",
            )}
            style={
              selected
                ? { backgroundColor: `${color}33`, color, boxShadow: `inset 0 0 0 1.5px ${color}` }
                : undefined
            }
          >
            <AppIcon name={name} className="size-5" />
          </button>
        );
      })}
    </div>
  );
}
