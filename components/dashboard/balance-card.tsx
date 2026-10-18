"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePrefs } from "@/components/providers/app-data";
import { convertTotals } from "@/lib/fx";
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

export function BalanceCard({
  totals,
  monthNet,
}: {
  totals: Record<string, number>;
  monthNet: number;
}) {
  const prefs = usePrefs();
  const { hidden, toggle } = useHiddenAmounts();
  // Foreign-currency accounts are folded into the default-currency total using
  // the user's exchange rates (Settings → Exchange rates).
  const converted = convertTotals(totals, prefs.fxRates, prefs.defaultCurrency);
  const main = converted.total;
  const foreign = converted.parts.filter((p) => p.currency !== prefs.defaultCurrency);
  const unconverted = Object.entries(converted.unconverted);

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
              formatMoney(main, prefs.defaultCurrency, { locale: prefs.locale })
            )}
          </span>
        </button>
        {foreign.length || unconverted.length ? (
          <div className="text-muted-foreground mt-1 flex flex-col gap-0.5 text-sm">
            {foreign.map((p) => (
              <span key={p.currency} className="num">
                {hidden ? (
                  `${p.currency} ••••`
                ) : (
                  <>
                    {formatMoney(p.original, p.currency, { locale: prefs.locale })}
                    <span aria-hidden="true"> → </span>
                    {formatMoney(p.converted, prefs.defaultCurrency, { locale: prefs.locale })}
                  </>
                )}
              </span>
            ))}
            {unconverted.map(([c, v]) => (
              <span key={c} className="num">
                {hidden ? (
                  `${c} ••••`
                ) : (
                  <>
                    {formatMoney(v, c, { locale: prefs.locale })}{" "}
                    <Link href="/settings" className="text-primary underline">
                      set a rate
                    </Link>
                  </>
                )}
              </span>
            ))}
          </div>
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
