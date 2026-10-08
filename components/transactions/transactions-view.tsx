"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Download, Loader2, Receipt, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { useAppData } from "@/components/providers/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { dayKey, dayLabel } from "@/lib/dates";
import type { TransactionPage, TransactionView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { parseFilters, type TransactionFilters } from "@/lib/validators/finance";
import { useAddTransaction } from "./add-transaction-provider";
import { FiltersSheet } from "./filters-sheet";
import { TransactionRow } from "./transaction-row";

function toQuery(filters: TransactionFilters, extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, ...extra })) if (v) params.set(k, String(v));
  return params.toString();
}

export function TransactionsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accounts, categories, prefs } = useAppData();
  const { open: openAdd } = useAddTransaction();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [search, setSearch] = useState(filters.q ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setFilters = (next: TransactionFilters) => {
    const qs = toQuery(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounced search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.q ?? "") !== search.trim())
        setFilters({ ...filters, q: search.trim() || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["transactions", filters],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const res = await fetch(
        `/api/transactions?${toQuery(filters, pageParam ? { cursor: pageParam } : {})}`,
        {
          signal,
        },
      );
      if (res.status === 401) {
        router.replace("/login");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to load transactions");
      return (await res.json()) as TransactionPage;
    },
    getNextPageParam: (last) => last.nextCursor,
  });

  // Infinite scroll sentinel
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const groups = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const dayTotals = Object.assign(
      {},
      ...pages.map((p) => p.dayTotals),
    ) as TransactionPage["dayTotals"];
    const map = new Map<string, TransactionView[]>();
    for (const tx of pages.flatMap((p) => p.items)) {
      const key = dayKey(new Date(tx.occurredAt), prefs.timezone);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, items]) => ({ key, items, total: dayTotals[key] }));
  }, [query.data, prefs.timezone]);

  const chips: { key: keyof TransactionFilters; label: string }[] = [];
  if (filters.type) chips.push({ key: "type", label: filters.type.toLowerCase() });
  if (filters.accountId)
    chips.push({
      key: "accountId",
      label: accounts.find((a) => a.id === filters.accountId)?.name ?? "Account",
    });
  if (filters.categoryId)
    chips.push({
      key: "categoryId",
      label: categories.find((c) => c.id === filters.categoryId)?.name ?? "Category",
    });
  if (filters.from) chips.push({ key: "from", label: `From ${filters.from}` });
  if (filters.to) chips.push({ key: "to", label: `To ${filters.to}` });
  if (filters.min) chips.push({ key: "min", label: `≥ ${filters.min}` });
  if (filters.max) chips.push({ key: "max", label: `≤ ${filters.max}` });

  const { q: _q, ...nonSearch } = filters;

  return (
    <div>
      <div className="bg-background/90 sticky top-0 z-20 -mx-4 px-4 pt-1 pb-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Search transactions"
              placeholder="Search payee, note, tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Filters${chips.length ? ` (${chips.length} active)` : ""}`}
            onClick={() => setFiltersOpen(true)}
            className="relative"
          >
            <SlidersHorizontal aria-hidden="true" />
            {chips.length ? (
              <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
                {chips.length}
              </span>
            ) : null}
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a
              href={`/api/export/csv?${toQuery(filters)}`}
              aria-label="Export filtered transactions as CSV"
              download
            >
              <Download aria-hidden="true" />
            </a>
          </Button>
        </div>
        {chips.length ? (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilters({ ...filters, [c.key]: undefined })}
                className="bg-surface-2 flex h-8 shrink-0 items-center gap-1 rounded-full pr-2 pl-3 text-xs font-medium capitalize"
                aria-label={`Remove filter ${c.label}`}
              >
                {c.label}
                <X className="text-muted-foreground size-3.5" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilters({});
              }}
              className="text-primary h-8 shrink-0 px-2 text-xs font-medium"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={Receipt}
          title="Couldn't load transactions"
          description={
            typeof navigator !== "undefined" && !navigator.onLine
              ? "You're offline."
              : "Please try again."
          }
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        />
      ) : groups.length === 0 ? (
        chips.length || filters.q ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description="Try a different search or clear the filters."
          />
        ) : (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Tap + to log your first expense or income."
            action={<Button onClick={() => openAdd()}>Add transaction</Button>}
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {groups.map((g) => {
            const net = g.total ? g.total.income - g.total.expense : null;
            return (
              <section key={g.key} aria-labelledby={`day-${g.key}`}>
                <div className="mb-1 flex items-baseline justify-between px-1">
                  <h2 id={`day-${g.key}`} className="text-muted-foreground text-sm font-semibold">
                    {dayLabel(g.key, prefs.timezone)}
                  </h2>
                  {net !== null && (g.total?.income || g.total?.expense) ? (
                    <Money
                      value={net}
                      sign="always"
                      className={cn(
                        "text-xs font-semibold",
                        net < 0 ? "text-muted-foreground" : "text-income",
                      )}
                    />
                  ) : null}
                </div>
                <ul className="-mx-2 grid grid-cols-1 gap-0.5">
                  {g.items.map((tx) => (
                    <li key={tx.id}>
                      <TransactionRow tx={tx} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <div ref={sentinel} className="flex h-12 items-center justify-center">
            {isFetchingNextPage ? (
              <Loader2
                className="text-muted-foreground size-5 animate-spin"
                aria-label="Loading more"
              />
            ) : !hasNextPage ? (
              <span className="text-muted-foreground text-xs">You&apos;re all caught up</span>
            ) : null}
          </div>
        </div>
      )}

      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={nonSearch}
        onApply={(f) => setFilters({ ...f, q: filters.q })}
      />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5" aria-busy="true" aria-label="Loading transactions">
      {[0, 1].map((g) => (
        <div key={g} className="grid grid-cols-1 gap-3">
          <Skeleton className="h-4 w-24" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="grid flex-1 grid-cols-1 gap-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
