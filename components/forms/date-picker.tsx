"use client";

import { tz } from "@date-fns/tz";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { dayKey, formatInTz, parseLocalDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

function splitValue(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

/** Human label for the date button: Today / Yesterday / 12 Oct 2026. */
function dateLabel(value: string, zone: string): string {
  const d = parseLocalDateTime(value, zone);
  if (!d) return "Pick a date";
  const key = dayKey(d, zone);
  const now = new Date();
  if (key === dayKey(now, zone)) return "Today";
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (key === dayKey(yesterday, zone)) return "Yesterday";
  return formatInTz(d, "d MMM yyyy", zone);
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DateTimePicker({
  value,
  onChange,
  timezone,
  weekStart = 1,
  id = "tx-date",
}: {
  /** "yyyy-MM-ddTHH:mm" (datetime-local shape). */
  value: string;
  onChange: (next: string) => void;
  timezone: string;
  weekStart?: number;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const { date, time } = splitValue(value);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = parseLocalDateTime(value, timezone);
    return d ? startOfMonth(d) : startOfMonth(new Date());
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 304 });

  // Close on outside tap / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  // When the popover opens, jump the calendar to the selected month and
  // position the popover under the button, clamped to the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const d = parseLocalDateTime(value, timezone);
    setViewMonth(startOfMonth(d ?? new Date()));
    const el = buttonRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const width = Math.min(304, window.innerWidth - 32);
      const left = Math.max(16, Math.min(r.left, window.innerWidth - width - 16));
      const top = Math.min(r.bottom + 8, window.innerHeight - 340);
      setPos({ top: Math.max(16, top), left, width });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const setDate = (day: Date) => {
    const datePart = format(day, "yyyy-MM-dd");
    const timePart = time || formatInTz(new Date(), "HH:mm", timezone);
    onChange(`${datePart}T${timePart}`);
    setOpen(false);
  };

  const setTime = (nextTime: string) => {
    const datePart = date || formatInTz(new Date(), "yyyy-MM-dd", timezone);
    onChange(`${datePart}T${nextTime}`);
  };

  const ctx = { in: tz(timezone) };
  const weekStartsOn = ((((weekStart ?? 1) % 7) + 7) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const selectedDay = parseLocalDateTime(value, timezone);
  const orderedWeekdays = Array.from(
    { length: 7 },
    (_, i) => WEEKDAY_LABELS[(weekStartsOn + i) % 7],
  );

  return (
    <>
      <div className="flex gap-2">
        <button
          ref={buttonRef}
          type="button"
          id={id}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Choose date"
          className={cn(
            "pressable border-input bg-card flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 text-base",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
          <span className="truncate">{dateLabel(value, timezone)}</span>
        </button>
        <div className="relative">
          <label className="sr-only" htmlFor={`${id}-time`}>
            Time
          </label>
          <Clock
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id={`${id}-time`}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-12 w-[7.5rem] pl-9 text-base"
          />
        </div>
      </div>

      {open
        ? createPortal(
            // NOTE: pointer-events-auto is required here. The add-transaction
            // sheet is a modal Vaul/Radix dialog, which sets
            // `body { pointer-events: none }` while open; only elements inside
            // the dialog layer get pointer events back. This popover is
            // portaled to document.body (outside the layer), so without this
            // class the calendar renders but no date can be clicked.
            <div
              ref={popRef}
              role="dialog"
              aria-label="Choose date"
              className="bg-card border-input pointer-events-auto fixed z-[100] rounded-2xl border p-3 shadow-2xl"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  aria-label="Previous month"
                  className="pressable hover:bg-surface-2 flex size-10 items-center justify-center rounded-xl"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <p className="text-base font-semibold">{format(viewMonth, "MMMM yyyy", ctx)}</p>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  aria-label="Next month"
                  className="pressable hover:bg-surface-2 flex size-10 items-center justify-center rounded-xl"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label="Calendar">
                {orderedWeekdays.map((d) => (
                  <span
                    key={d}
                    className="text-muted-foreground flex h-8 items-center justify-center text-xs font-medium"
                  >
                    {d}
                  </span>
                ))}
                {days.map((day) => {
                  const inMonth = day.getMonth() === viewMonth.getMonth();
                  const selected = selectedDay ? isSameDay(day, selectedDay) : false;
                  const today = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      role="gridcell"
                      aria-selected={selected}
                      aria-label={format(day, "d MMMM yyyy")}
                      onClick={() => setDate(day)}
                      className={cn(
                        "pressable flex h-10 items-center justify-center rounded-lg text-[15px] transition-colors",
                        !inMonth && "text-muted-foreground/40",
                        selected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : today
                            ? "text-primary font-semibold ring-1 ring-primary/50"
                            : "hover:bg-surface-2",
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
