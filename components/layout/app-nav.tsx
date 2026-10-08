"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/logo";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isActive, SIDEBAR_ITEMS, TAB_ITEMS } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const { open } = useAddTransaction();
  const [first, second, third, fourth] = TAB_ITEMS;
  const tabs = [first, second, null, third, fourth];

  return (
    <nav
      aria-label="Main"
      className="bg-glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
        {tabs.map((item, i) =>
          item ? (
            <li key={item.href} className="flex justify-center">
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "pressable text-muted-foreground flex min-h-11 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium transition-colors",
                  isActive(pathname, item.href) && "text-foreground",
                )}
              >
                <item.icon
                  className={cn("size-[22px]", isActive(pathname, item.href) && "text-primary")}
                  strokeWidth={isActive(pathname, item.href) ? 2.4 : 2}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            </li>
          ) : (
            <li key={`fab-${i}`} className="flex justify-center">
              <button
                type="button"
                onClick={() => open()}
                aria-label="Add transaction"
                className="pressable text-primary-foreground ring-background -mt-7 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg ring-4 shadow-emerald-500/30"
              >
                <Plus className="size-7" strokeWidth={2.6} aria-hidden="true" />
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { open } = useAddTransaction();
  return (
    <aside className="bg-card/40 sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 px-2" aria-label="Wealth home">
        <Wordmark size={34} />
      </Link>
      <Button onClick={() => open()} size="lg" className="mb-6 w-full">
        <Plus aria-hidden="true" /> Add transaction
      </Button>
      <nav aria-label="Main">
        <ul className="grid grid-cols-1 gap-1">
          {SIDEBAR_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-muted-foreground hover:bg-surface-2 hover:text-foreground flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                    active && "bg-surface-2 text-foreground",
                  )}
                >
                  <item.icon
                    className={cn("size-5", active && "text-primary")}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
