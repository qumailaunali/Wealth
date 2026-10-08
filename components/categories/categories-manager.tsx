"use client";

import { ChevronRight, Plus, Shapes } from "lucide-react";
import { useState } from "react";
import { IconBadge } from "@/components/app-icon";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { useAppData } from "@/components/providers/app-data";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import type { CategoryView, CatType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryFormSheet } from "./category-form-sheet";

export function CategoriesManager({ usage }: { usage: Record<string, number> }) {
  const { categories } = useAppData();
  const [type, setType] = useState<CatType>("EXPENSE");
  const [sheet, setSheet] = useState<{
    open: boolean;
    category?: CategoryView;
    parentId?: string | null;
  }>({
    open: false,
  });

  const ofType = categories.filter((c) => c.type === type);
  const active = ofType.filter((c) => !c.isArchived);
  const archived = ofType.filter((c) => c.isArchived);
  const parents = active.filter((c) => !c.parentId || !active.some((p) => p.id === c.parentId));

  const Row = ({ c, child = false }: { c: CategoryView; child?: boolean }) => (
    <li>
      <button
        type="button"
        onClick={() => setSheet({ open: true, category: c })}
        className={cn(
          "pressable hover:bg-surface-2/70 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
          child && "pl-10",
        )}
      >
        <IconBadge name={c.icon} color={c.color} size={child ? "sm" : "md"} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{c.name}</span>
          <span className="text-muted-foreground block text-xs">
            {usage[c.id] ?? 0} transaction{(usage[c.id] ?? 0) === 1 ? "" : "s"}
            {c.monthlyBudget ? (
              <>
                {" · Budget "}
                <Money value={c.monthlyBudget} />
              </>
            ) : null}
          </span>
        </span>
        <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
      </button>
    </li>
  );

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex gap-2">
        <Segmented
          className="flex-1"
          label="Category type"
          value={type}
          onChange={setType}
          options={[
            { value: "EXPENSE", label: "Expense" },
            { value: "INCOME", label: "Income" },
          ]}
        />
        <Button onClick={() => setSheet({ open: true })} className="h-12">
          <Plus aria-hidden="true" /> New
        </Button>
      </div>

      {parents.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title={`No ${type.toLowerCase()} categories`}
          action={<Button onClick={() => setSheet({ open: true })}>Create category</Button>}
        />
      ) : (
        <ul className="-mx-3 grid grid-cols-1 gap-0.5">
          {parents.map((p) => (
            <li key={p.id}>
              <ul>
                <Row c={p} />
                {active
                  .filter((c) => c.parentId === p.id)
                  .map((c) => (
                    <Row key={c.id} c={c} child />
                  ))}
                {!p.parentId ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => setSheet({ open: true, parentId: p.id })}
                      className="text-muted-foreground hover:text-foreground ml-10 flex h-9 items-center gap-1.5 px-3 text-xs font-medium"
                    >
                      <Plus className="size-3.5" aria-hidden="true" /> Add sub-category to {p.name}
                    </button>
                  </li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {archived.length ? (
        <section aria-labelledby="cat-archived">
          <h2 id="cat-archived" className="text-muted-foreground mb-2 text-sm font-semibold">
            Archived
          </h2>
          <ul className="-mx-3 grid grid-cols-1 gap-0.5 opacity-70">
            {archived.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </ul>
        </section>
      ) : null}

      <CategoryFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        category={sheet.category}
        defaultType={type}
        defaultParentId={sheet.parentId}
        usage={sheet.category ? (usage[sheet.category.id] ?? 0) : 0}
      />
    </div>
  );
}
