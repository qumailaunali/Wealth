"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, Loader2, Pause, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { IconBadge } from "@/components/app-icon";
import { applyFieldErrors, Field, fieldA11y } from "@/components/forms/field";
import { Money } from "@/components/money";
import { useAppData } from "@/components/providers/app-data";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import {
  deleteRecurringRule,
  saveRecurringRule,
  setRecurringActive,
} from "@/lib/actions/recurring";
import { formatInTz, toLocalDateTimeInput } from "@/lib/dates";
import { toInputString } from "@/lib/money";
import type { RecurringView } from "@/lib/queries/recurring";
import { FREQUENCY_LABELS } from "@/lib/recurrence";
import type { TxType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type RecurringInput, recurringSchema } from "@/lib/validators/finance";

const UNIT: Record<string, [string, string]> = {
  DAILY: ["day", "days"],
  WEEKLY: ["week", "weeks"],
  MONTHLY: ["month", "months"],
  YEARLY: ["year", "years"],
};

function describe(rule: { frequency: string; interval: number }) {
  if (rule.interval === 1) return FREQUENCY_LABELS[rule.frequency as keyof typeof FREQUENCY_LABELS];
  const [, plural] = UNIT[rule.frequency] ?? ["", ""];
  return `Every ${rule.interval} ${plural}`;
}

export function RecurringManager({ rules }: { rules: RecurringView[] }) {
  const { prefs } = useAppData();
  const [sheet, setSheet] = useState<{ open: boolean; rule?: RecurringView }>({ open: false });
  const [pending, startTransition] = useTransition();

  const toggle = (rule: RecurringView) =>
    startTransition(async () => {
      const res = await setRecurringActive(rule.id, !rule.isActive);
      if (!res.ok) toast.error(res.error);
      else toast.success(rule.isActive ? "Paused" : "Resumed");
    });

  const remove = (rule: RecurringView) =>
    startTransition(async () => {
      if (
        !window.confirm(
          `Delete "${rule.title || "this rule"}"? Already-created transactions are kept.`,
        )
      )
        return;
      const res = await deleteRecurringRule(rule.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Recurring rule deleted");
    });

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="bg-card text-muted-foreground rounded-2xl border p-4 text-sm">
        Due transactions are created automatically whenever you open the app, so nothing is missed
        even without a background job.
      </div>
      <Button onClick={() => setSheet({ open: true })} className="justify-self-start">
        <Plus aria-hidden="true" /> New recurring transaction
      </Button>

      {rules.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring transactions"
          description="Automate rent, salary, subscriptions and other regular payments."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className={cn("bg-card rounded-2xl border p-3", !r.isActive && "opacity-60")}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSheet({ open: true, rule: r })}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {r.type === "TRANSFER" ? (
                    <span className="bg-transfer/15 text-transfer flex size-10 items-center justify-center rounded-xl">
                      <ArrowLeftRight className="size-5" aria-hidden="true" />
                    </span>
                  ) : (
                    <IconBadge
                      name={r.category?.icon ?? "circle-ellipsis"}
                      color={r.category?.color ?? "#64748B"}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {r.title || r.category?.name || "Transfer"}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {describe(r)} ·{" "}
                      {r.isActive
                        ? `next ${formatInTz(new Date(r.nextRunAt), "d MMM yyyy", prefs.timezone)}`
                        : r.endsAt && new Date(r.endsAt) < new Date()
                          ? "ended"
                          : "paused"}
                    </span>
                  </span>
                  <Money
                    value={r.type === "EXPENSE" ? -r.amount : r.amount}
                    currency={r.currency}
                    sign={r.type === "TRANSFER" ? "never" : "always"}
                    tone={r.type === "EXPENSE" ? undefined : r.type}
                    className="font-semibold"
                  />
                </button>
              </div>
              <div className="mt-2 flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggle(r)} disabled={pending}>
                  {r.isActive ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                  {r.isActive ? "Pause" : "Resume"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-expense"
                  onClick={() => remove(r)}
                  disabled={pending}
                >
                  <Trash2 aria-hidden="true" /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg">
              {sheet.rule ? "Edit recurring" : "New recurring transaction"}
            </DrawerTitle>
            <DrawerDescription>Occurrences up to today are created immediately.</DrawerDescription>
          </DrawerHeader>
          {sheet.open ? (
            <RecurringForm rule={sheet.rule} onDone={() => setSheet({ open: false })} />
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function RecurringForm({ rule, onDone }: { rule?: RecurringView; onDone: () => void }) {
  const { accounts, categories, prefs } = useAppData();
  const [pending, startTransition] = useTransition();
  const active = accounts.filter((a) => !a.isArchived);

  const form = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: rule
      ? {
          type: rule.type,
          amount: toInputString(rule.amount, rule.currency),
          toAmount:
            rule.toAmount !== null
              ? toInputString(
                  rule.toAmount,
                  active.find((a) => a.id === rule.toAccount?.id)?.currency ?? rule.currency,
                )
              : "",
          accountId: rule.account.id,
          toAccountId: rule.toAccount?.id ?? null,
          categoryId: rule.category?.id ?? null,
          title: rule.title,
          note: rule.note ?? "",
          frequency: rule.frequency,
          interval: rule.interval,
          startAt: toLocalDateTimeInput(new Date(rule.startAt), prefs.timezone),
          endsAt: rule.endsAt
            ? formatInTz(new Date(rule.endsAt), "yyyy-MM-dd", prefs.timezone)
            : "",
        }
      : {
          type: "EXPENSE",
          amount: "",
          toAmount: "",
          accountId: active[0]?.id ?? "",
          toAccountId: null,
          categoryId: null,
          title: "",
          note: "",
          frequency: "MONTHLY",
          interval: 1,
          startAt: toLocalDateTimeInput(new Date(), prefs.timezone),
          endsAt: "",
        },
  });
  const { errors } = form.formState;
  const [type, accountId, toAccountId] = useWatch({
    control: form.control,
    name: ["type", "accountId", "toAccountId"],
  });
  const from = active.find((a) => a.id === accountId);
  const to = active.find((a) => a.id === toAccountId);

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await saveRecurringRule(rule?.id ?? null, {
        ...values,
        toAccountId: values.type === "TRANSFER" ? values.toAccountId : null,
        categoryId: values.type === "TRANSFER" ? null : values.categoryId,
      });
      if (!res.ok) {
        applyFieldErrors(res.fieldErrors, form.setError);
        toast.error(res.error);
        return;
      }
      toast.success(
        res.data.generated
          ? `Saved · ${res.data.generated} transaction${res.data.generated === 1 ? "" : "s"} created`
          : "Recurring transaction saved",
      );
      onDone();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-1 gap-4 overflow-y-auto px-4 pb-4">
        <Segmented
          label="Type"
          value={type}
          onChange={(t: TxType) => {
            form.setValue("type", t);
            form.setValue("categoryId", null);
          }}
          options={[
            { value: "EXPENSE", label: "Expense", activeClassName: "bg-expense/15 text-expense" },
            { value: "INCOME", label: "Income", activeClassName: "bg-income/15 text-income" },
            {
              value: "TRANSFER",
              label: "Transfer",
              activeClassName: "bg-transfer/15 text-transfer",
            },
          ]}
        />
        <Field id="r-title" label="Title" error={errors.title?.message}>
          <Input
            id="r-title"
            placeholder="e.g. Rent, Netflix, Salary"
            {...form.register("title")}
          />
        </Field>
        <Field
          id="r-amount"
          label={`Amount (${from?.currency ?? prefs.defaultCurrency})`}
          error={errors.amount?.message}
        >
          <Input
            {...fieldA11y("r-amount", errors.amount?.message)}
            inputMode="decimal"
            placeholder="0"
            {...form.register("amount")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="r-account"
            label={type === "TRANSFER" ? "From" : "Account"}
            error={errors.accountId?.message}
          >
            <NativeSelect id="r-account" {...form.register("accountId")}>
              {active.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {type === "TRANSFER" ? (
            <Field id="r-to" label="To" error={errors.toAccountId?.message}>
              <NativeSelect
                id="r-to"
                {...form.register("toAccountId", { setValueAs: (v: string) => v || null })}
              >
                <option value="">Choose…</option>
                {active
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
          ) : (
            <Field id="r-category" label="Category" error={errors.categoryId?.message}>
              <NativeSelect
                id="r-category"
                {...form.register("categoryId", { setValueAs: (v: string) => v || null })}
              >
                <option value="">Choose…</option>
                {categories
                  .filter((c) => c.type === type && !c.isArchived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? "↳ " : ""}
                      {c.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
          )}
        </div>
        {type === "TRANSFER" && from && to && from.currency !== to.currency ? (
          <Field
            id="r-toamount"
            label={`Amount received (${to.currency})`}
            error={errors.toAmount?.message}
          >
            <Input id="r-toamount" inputMode="decimal" {...form.register("toAmount")} />
          </Field>
        ) : null}
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field id="r-frequency" label="Repeats">
            <NativeSelect id="r-frequency" {...form.register("frequency")}>
              {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="r-interval" label="Every" error={errors.interval?.message}>
            <Input
              id="r-interval"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              {...form.register("interval")}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="r-start" label="First date" error={errors.startAt?.message}>
            <Input
              id="r-start"
              type="datetime-local"
              className="text-sm"
              {...form.register("startAt")}
            />
          </Field>
          <Field id="r-end" label="Ends (optional)" error={errors.endsAt?.message}>
            <Input id="r-end" type="date" className="text-sm" {...form.register("endsAt")} />
          </Field>
        </div>
      </div>
      <div className="border-t p-4">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {rule ? "Save changes" : "Create"}
        </Button>
      </div>
    </form>
  );
}
