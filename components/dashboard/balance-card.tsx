"use client";

import { Eye, EyeOff } from "lucide-react";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePrefs } from "@/components/providers/app-data";
import { formatMoney } from "@/lib/money";

const HIDE_KEY = "wealth:hide-balance";
const HIDE_EVENT = "wealth:hide-balance-changed";

function subscribeHidden(cb: () => void) {
  window.addEventListener(HIDE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(HIDE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function readHidden() {
  try {
    return window.localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Shared privacy toggle (persisted per device). */
export function useHiddenAmounts() {
  const hidden = useSyncExternalStore(subscribeHidden, readHidden, () => false);
  const toggle = () => {
    try {
      window.localStorage.setItem(HIDE_KEY, hidden ? "0" : "1");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(HIDE_EVENT));
  };
  return { hidden, toggle };
}

function CountUp({ value, currency, locale }: { value: number; currency: string; locale: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const [display, setDisplay] = useState(() =>
    formatMoney(reduce ? value : 0, currency, { locale }),
  );
  useMotionValueEvent(mv, "change", (v) =>
    setDisplay(formatMoney(Math.round(v), currency, { locale })),
  );
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, mv, reduce]);
  return <>{display}</>;
}

export function BalanceCard({
  totals,
  monthNet,
}: {
  totals: Record<string, number>;
  monthNet: number;
}) {
  const prefs = usePrefs();
  const { hidden, toggle } = useHiddenAmounts();
  const main = totals[prefs.defaultCurrency] ?? 0;
  const others = Object.entries(totals).filter(([c]) => c !== prefs.defaultCurrency);

  return (
    <section
      aria-label="Total balance"
      className="via-card to-card relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/25 p-5 shadow-2xl shadow-black/20"
    >
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-10 size-48 rounded-full bg-emerald-400/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-10 size-40 rounded-full bg-teal-400/10 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm font-medium">Total balance</p>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={hidden}
            aria-label={hidden ? "Show balance" : "Hide balance"}
            className="pressable text-muted-foreground hover:text-foreground -mr-2 flex size-11 items-center justify-center rounded-xl"
          >
            {hidden ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="mt-1 block max-w-full truncate text-left"
          aria-label={hidden ? "Balance hidden, tap to show" : "Tap to hide balance"}
        >
          <span className="num text-[2.6rem] leading-tight font-extrabold tracking-tight">
            {hidden ? (
              <span aria-hidden="true">••••••</span>
            ) : (
              <CountUp value={main} currency={prefs.defaultCurrency} locale={prefs.locale} />
            )}
          </span>
        </button>
        {others.length ? (
          <p className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 text-sm">
            {others.map(([c, v]) => (
              <span key={c} className="num">
                {hidden ? `${c} ••••` : formatMoney(v, c, { locale: prefs.locale })}
              </span>
            ))}
          </p>
        ) : null}
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-medium">
          <span className={monthNet >= 0 ? "text-income" : "text-expense"}>
            {hidden
              ? "••••"
              : formatMoney(monthNet, prefs.defaultCurrency, {
                  locale: prefs.locale,
                  sign: "always",
                })}
          </span>
          <span className="text-muted-foreground">saved this month</span>
        </p>
      </div>
    </section>
  );
}
