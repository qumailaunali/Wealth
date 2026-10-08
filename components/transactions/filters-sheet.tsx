"use client";

import { useState } from "react";
import { useAppData } from "@/components/providers/app-data";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import type { TransactionFilters } from "@/lib/validators/finance";

type Draft = Omit<TransactionFilters, "q">;

export function FiltersSheet({
  open,
  onOpenChange,
  value,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: Draft;
  onApply: (filters: Draft) => void;
}) {
  const { accounts, categories } = useAppData();
  const [draft, setDraft] = useState<Draft>(value);
  const set = <K extends keyof Draft>(key: K, v: Draft[K] | "") =>
    setDraft((d) => ({ ...d, [key]: v === "" ? undefined : v }));

  const visibleCats = categories.filter(
    (c) =>
      !c.isArchived && (!draft.type || draft.type === "TRANSFER" ? true : c.type === draft.type),
  );

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(value);
        onOpenChange(o);
      }}
    >
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg">Filter transactions</DrawerTitle>
          <DrawerDescription>Narrow the list. Exports use the same filters.</DrawerDescription>
        </DrawerHeader>
        <div className="grid grid-cols-1 gap-4 overflow-y-auto px-4 pb-2">
          <div className="grid grid-cols-1 gap-2">
            <span className="text-muted-foreground text-sm font-medium">Type</span>
            <Segmented
              label="Type"
              value={draft.type ?? "ALL"}
              onChange={(v) => set("type", v === "ALL" ? "" : v)}
              options={[
                { value: "ALL", label: "All" },
                { value: "EXPENSE", label: "Expense" },
                { value: "INCOME", label: "Income" },
                { value: "TRANSFER", label: "Transfer" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="f-account" className="text-muted-foreground">
              Account
            </Label>
            <NativeSelect
              id="f-account"
              value={draft.accountId ?? ""}
              onChange={(e) => set("accountId", e.target.value)}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.isArchived ? " (archived)" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
          {draft.type !== "TRANSFER" ? (
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="f-category" className="text-muted-foreground">
                Category
              </Label>
              <NativeSelect
                id="f-category"
                value={draft.categoryId ?? ""}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">All categories</option>
                {visibleCats
                  .filter((c) => !c.parentId)
                  .map((p) => [
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type === "EXPENSE" ? "expense" : "income"})
                    </option>,
                    ...visibleCats
                      .filter((c) => c.parentId === p.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {"  "}↳ {c.name}
                        </option>
                      )),
                  ])}
              </NativeSelect>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="f-from" className="text-muted-foreground">
                From
              </Label>
              <Input
                id="f-from"
                type="date"
                value={draft.from ?? ""}
                onChange={(e) => set("from", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="f-to" className="text-muted-foreground">
                To
              </Label>
              <Input
                id="f-to"
                type="date"
                value={draft.to ?? ""}
                onChange={(e) => set("to", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="f-min" className="text-muted-foreground">
                Min amount
              </Label>
              <Input
                id="f-min"
                inputMode="decimal"
                placeholder="0"
                value={draft.min ?? ""}
                onChange={(e) => set("min", e.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="f-max" className="text-muted-foreground">
                Max amount
              </Label>
              <Input
                id="f-max"
                inputMode="decimal"
                placeholder="Any"
                value={draft.max ?? ""}
                onChange={(e) => set("max", e.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-4">
          <Button variant="outline" size="lg" className="flex-1" onClick={() => setDraft({})}>
            Reset
          </Button>
          <Button
            size="lg"
            className="flex-[2]"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Show results
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
