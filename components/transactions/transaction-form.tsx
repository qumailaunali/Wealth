"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, CalendarClock, ChevronDown, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { IconBadge } from "@/components/app-icon";
import { applyFieldErrors, Field, fieldA11y } from "@/components/forms/field";
import { Money } from "@/components/money";
import { useAppData } from "@/components/providers/app-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/actions/transactions";
import { toLocalDateTimeInput } from "@/lib/dates";
import { applyKey, formatKeypadDisplay, type KeypadKey } from "@/lib/keypad";
import { currencyDecimals, toInputString } from "@/lib/money";
import { enqueueTransaction, isNetworkError } from "@/lib/offline-queue";
import type { AccountView, CategoryView, TransactionView, TxType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type TransactionInput, transactionSchema } from "@/lib/validators/finance";
import { AmountKeypad } from "./amount-keypad";

const LAST_ACCOUNT_KEY = "wealth:last-account";

const TYPE_OPTIONS: { value: TxType; label: string; activeClassName: string }[] = [
  { value: "EXPENSE", label: "Expense", activeClassName: "bg-expense/15 text-expense" },
  { value: "INCOME", label: "Income", activeClassName: "bg-income/15 text-income" },
  { value: "TRANSFER", label: "Transfer", activeClassName: "bg-transfer/15 text-transfer" },
];

function readLastAccount(): string | null {
  try {
    return window.localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function buildDefaults(
  initial: TransactionView | undefined,
  type: TxType,
  accounts: AccountView[],
  timezone: string,
): TransactionInput {
  if (initial) {
    return {
      type: initial.type,
      amount: toInputString(initial.amount, initial.currency),
      toAmount:
        initial.toAmount !== null && initial.toCurrency
          ? toInputString(initial.toAmount, initial.toCurrency)
          : "",
      accountId: initial.account.id,
      toAccountId: initial.toAccount?.id ?? null,
      categoryId: initial.category?.id ?? null,
      title: initial.title,
      note: initial.note ?? "",
      occurredAt: toLocalDateTimeInput(new Date(initial.occurredAt), timezone),
      tags: initial.tags,
      receiptUrl: initial.receiptUrl ?? "",
    };
  }
  const active = accounts.filter((a) => !a.isArchived);
  const last = typeof window !== "undefined" ? readLastAccount() : null;
  const accountId = active.find((a) => a.id === last)?.id ?? active[0]?.id ?? "";
  return {
    type,
    amount: "",
    toAmount: "",
    accountId,
    toAccountId: type === "TRANSFER" ? (active.find((a) => a.id !== accountId)?.id ?? null) : null,
    categoryId: null,
    title: "",
    note: "",
    occurredAt: toLocalDateTimeInput(new Date(), timezone),
    tags: [],
    receiptUrl: "",
  };
}

/** Categories ordered parent → children, filtered by type. */
function orderedCategories(categories: CategoryView[], type: TxType) {
  if (type === "TRANSFER") return [];
  const ofType = categories.filter((c) => c.type === type && !c.isArchived);
  const parents = ofType.filter((c) => !c.parentId || !ofType.some((p) => p.id === c.parentId));
  return parents.flatMap((p) => [
    { ...p, isChild: false },
    ...ofType.filter((c) => c.parentId === p.id).map((c) => ({ ...c, isChild: true })),
  ]);
}

export function TransactionForm({
  initial,
  defaultType = "EXPENSE",
  onDone,
  active = true,
}: {
  initial?: TransactionView;
  defaultType?: TxType;
  onDone: () => void;
  /** Whether physical-keyboard shortcuts are enabled (sheet is open) */
  active?: boolean;
}) {
  const { accounts, categories, prefs } = useAppData();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(
    Boolean(initial?.note || initial?.tags.length || initial?.receiptUrl),
  );
  const [tagText, setTagText] = useState(initial?.tags.join(", ") ?? "");

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (a) => !a.isArchived || a.id === initial?.account.id || a.id === initial?.toAccount?.id,
      ),
    [accounts, initial],
  );

  const form = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: buildDefaults(initial, defaultType, activeAccounts, prefs.timezone),
  });
  const { errors, isSubmitted } = form.formState;
  const [type, amount, accountId, toAccountId, categoryId] = useWatch({
    control: form.control,
    name: ["type", "amount", "accountId", "toAccountId", "categoryId"],
  });

  const account = activeAccounts.find((a) => a.id === accountId);
  const toAccount = activeAccounts.find((a) => a.id === toAccountId);
  const currency = account?.currency ?? prefs.defaultCurrency;
  const decimals = currencyDecimals(currency);
  const crossCurrency =
    type === "TRANSFER" && account && toAccount && account.currency !== toAccount.currency;
  const cats = useMemo(() => orderedCategories(categories, type), [categories, type]);
  const decimalSymbol = (1.1).toLocaleString(prefs.locale).charAt(1) || ".";

  const onKey = useCallback(
    (key: KeypadKey) => {
      const next = applyKey(form.getValues("amount"), key, decimals);
      form.setValue("amount", next, { shouldValidate: isSubmitted, shouldDirty: true });
    },
    [form, decimals, isSubmitted],
  );

  const setType = (t: TxType) => {
    form.setValue("type", t);
    form.setValue("categoryId", null);
    if (t === "TRANSFER" && !form.getValues("toAccountId")) {
      form.setValue(
        "toAccountId",
        activeAccounts.find((a) => a.id !== form.getValues("accountId"))?.id ?? null,
      );
    }
    form.clearErrors();
  };

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    const tags = tagText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);
    const input: TransactionInput = {
      ...values,
      tags,
      toAccountId: values.type === "TRANSFER" ? values.toAccountId : null,
      categoryId: values.type === "TRANSFER" ? null : values.categoryId,
    };

    startTransition(async () => {
      let res;
      if (initial) {
        res = await updateTransaction(initial.id, input);
      } else {
        const withId = { ...input, clientId: crypto.randomUUID() };
        const queueOffline = async () => {
          await enqueueTransaction(withId);
          toast("Saved offline", {
            description: "It will sync automatically when you're back online.",
          });
          onDone();
        };
        if (!navigator.onLine) return queueOffline();
        try {
          res = await createTransaction(withId);
        } catch (error) {
          if (isNetworkError(error)) return queueOffline();
          throw error;
        }
      }
      if (!res.ok) {
        setFormError(res.error);
        applyFieldErrors(res.fieldErrors, form.setError);
        return;
      }
      try {
        window.localStorage.setItem(LAST_ACCOUNT_KEY, input.accountId);
      } catch {
        /* storage unavailable */
      }
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(initial ? "Transaction updated" : "Transaction added");
      onDone();
    });
  });

  const onDelete = () => {
    if (!initial) return;
    startTransition(async () => {
      const res = await deleteTransaction(initial.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onDone();
      toast("Transaction deleted", {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: async () => {
            const restored = await createTransaction(res.data.restore);
            if (restored.ok) {
              await queryClient.invalidateQueries({ queryKey: ["transactions"] });
              toast.success("Transaction restored");
            } else toast.error(restored.error);
          },
        },
      });
    });
  };

  // Physical keyboard: digits / . / Backspace edit the amount, Enter saves.
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey)
      )
        return;
      if (/^[0-9]$/.test(e.key)) onKey(e.key as KeypadKey);
      else if (e.key === "." || e.key === ",") onKey(".");
      else if (e.key === "Backspace") onKey("back");
      else if (e.key === "Enter") {
        e.preventDefault();
        void submit();
        return;
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onKey, submit]);

  if (activeAccounts.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-semibold">Add an account first</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Transactions need an account to live in.
        </p>
        <Button asChild className="mt-5" onClick={onDone}>
          <Link href="/accounts?new=1">Create account</Link>
        </Button>
      </div>
    );
  }

  const amountTone =
    type === "EXPENSE" ? "text-expense" : type === "INCOME" ? "text-income" : "text-transfer";

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        <Segmented
          label="Transaction type"
          value={type}
          onChange={setType}
          options={TYPE_OPTIONS}
        />

        {/* Amount display */}
        <div className="mt-4 flex flex-col items-center" aria-live="polite">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {currency}
          </span>
          <output
            aria-label="Amount"
            className={cn(
              "num mt-1 max-w-full truncate text-[44px] leading-none font-bold tracking-tight",
              amount ? amountTone : "text-muted-foreground/60",
            )}
          >
            {formatKeypadDisplay(amount, prefs.locale)}
          </output>
          {errors.amount ? (
            <p role="alert" className="text-expense mt-2 text-sm">
              {errors.amount.message}
            </p>
          ) : null}
        </div>

        {/* Category chips / transfer accounts */}
        {type === "TRANSFER" ? (
          <div className="mt-5 grid grid-cols-1 gap-3">
            <AccountChips
              label="From"
              accounts={activeAccounts}
              value={accountId}
              onChange={(id) => form.setValue("accountId", id, { shouldValidate: isSubmitted })}
            />
            <div className="text-muted-foreground -my-1 flex justify-center" aria-hidden="true">
              <ArrowDown className="size-4" />
            </div>
            <AccountChips
              label="To"
              accounts={activeAccounts.filter((a) => a.id !== accountId)}
              value={toAccountId ?? ""}
              onChange={(id) => form.setValue("toAccountId", id, { shouldValidate: isSubmitted })}
              error={errors.toAccountId?.message}
            />
            {crossCurrency ? (
              <Field
                id="toAmount"
                label={`Amount received (${toAccount?.currency})`}
                error={errors.toAmount?.message}
              >
                <Input
                  {...fieldA11y("toAmount", errors.toAmount?.message)}
                  inputMode="decimal"
                  placeholder="0"
                  {...form.register("toAmount")}
                />
              </Field>
            ) : null}
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-muted-foreground mb-2 text-xs font-medium" id="cat-label">
              Category
            </p>
            {cats.length === 0 ? (
              <p className="bg-surface-2 text-muted-foreground rounded-xl p-3 text-sm">
                No {type.toLowerCase()} categories yet.{" "}
                <Link href="/categories" className="text-primary underline" onClick={onDone}>
                  Create one
                </Link>
              </p>
            ) : (
              <div
                role="radiogroup"
                aria-labelledby="cat-label"
                className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1"
              >
                {cats.map((c) => {
                  const selected = c.id === categoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        form.setValue("categoryId", c.id, { shouldValidate: isSubmitted })
                      }
                      className={cn(
                        "pressable flex h-11 shrink-0 snap-start items-center gap-2 rounded-2xl border px-3 text-sm font-medium whitespace-nowrap transition-colors",
                        selected
                          ? "text-foreground border-transparent"
                          : "bg-surface-2/60 text-muted-foreground",
                        c.isChild && "h-10 text-[13px]",
                      )}
                      style={
                        selected
                          ? {
                              backgroundColor: `${c.color}2e`,
                              boxShadow: `inset 0 0 0 1.5px ${c.color}`,
                            }
                          : undefined
                      }
                    >
                      <IconBadge
                        name={c.icon}
                        color={c.color}
                        size="sm"
                        className="size-7 rounded-lg"
                      />
                      {c.isChild ? <span className="text-muted-foreground">↳</span> : null}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.categoryId ? (
              <p role="alert" className="text-expense mt-1.5 text-sm">
                {errors.categoryId.message}
              </p>
            ) : null}
            <div className="mt-3">
              <AccountChips
                label="Account"
                accounts={activeAccounts}
                value={accountId}
                onChange={(id) => form.setValue("accountId", id, { shouldValidate: isSubmitted })}
              />
            </div>
          </div>
        )}

        {/* Title + date */}
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <label className="sr-only" htmlFor="tx-title">
            Title or payee
          </label>
          <Input
            id="tx-title"
            placeholder={
              type === "INCOME"
                ? "From (e.g. Salary)"
                : type === "TRANSFER"
                  ? "Note"
                  : "Payee (e.g. Daraz)"
            }
            autoComplete="off"
            enterKeyHint="done"
            {...form.register("title")}
          />
          <div className="relative">
            <label className="sr-only" htmlFor="tx-date">
              Date and time
            </label>
            <CalendarClock
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="tx-date"
              type="datetime-local"
              className="w-[11.5rem] pl-9 text-sm [&::-webkit-calendar-picker-indicator]:opacity-0"
              {...form.register("occurredAt")}
            />
          </div>
        </div>
        {errors.occurredAt ? (
          <p className="text-expense mt-1 text-sm">{errors.occurredAt.message}</p>
        ) : null}

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="text-muted-foreground mt-2 flex h-10 items-center gap-1 text-sm font-medium"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", showMore && "rotate-180")}
            aria-hidden="true"
          />
          {showMore ? "Fewer details" : "Note, tags & receipt"}
        </button>
        {showMore ? (
          <div className="grid grid-cols-1 gap-3 pb-2">
            <Field id="tx-note" label="Note" error={errors.note?.message}>
              <Textarea
                id="tx-note"
                rows={2}
                placeholder="Anything to remember?"
                {...form.register("note")}
              />
            </Field>
            <Field id="tx-tags" label="Tags" hint="Separate with commas, e.g. trip, family">
              <Input
                id="tx-tags"
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="trip, family"
                autoCapitalize="none"
              />
            </Field>
            <Field
              id="tx-receipt"
              label="Receipt link"
              error={errors.receiptUrl?.message}
              hint="Paste an image link. Uploads are coming soon."
            >
              <Input
                {...fieldA11y("tx-receipt", errors.receiptUrl?.message)}
                type="url"
                inputMode="url"
                placeholder="https://"
                {...form.register("receiptUrl")}
              />
            </Field>
          </div>
        ) : null}

        {formError ? (
          <p role="alert" className="bg-expense/10 text-expense mt-2 rounded-xl px-3 py-2 text-sm">
            {formError}
          </p>
        ) : null}
      </div>

      {/* Keypad + actions pinned to the bottom for thumb reach */}
      <div className="bg-card shrink-0 border-t px-4 pt-3 pb-3">
        <AmountKeypad onKey={onKey} allowDecimal={decimals > 0} decimalSymbol={decimalSymbol} />
        <div className="mt-3 flex gap-2">
          {initial ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onDelete}
              disabled={pending}
              aria-label="Delete transaction"
              className="text-expense px-4"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          ) : null}
          <Button type="submit" size="lg" className="flex-1" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {initial ? "Save changes" : `Save ${type.toLowerCase()}`}
          </Button>
        </div>
      </div>
    </form>
  );
}

function AccountChips({
  label,
  accounts,
  value,
  onChange,
  error,
}: {
  label: string;
  accounts: AccountView[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const id = `acc-${label.toLowerCase()}`;
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-medium" id={id}>
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {accounts.map((a) => {
          const selected = a.id === value;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(a.id)}
              className={cn(
                "pressable flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-3 text-left transition-colors",
                selected ? "border-primary/60 bg-primary/10" : "bg-surface-2/60",
              )}
            >
              <IconBadge name={a.icon} color={a.color} size="sm" className="size-7 rounded-lg" />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium whitespace-nowrap">{a.name}</span>
                <Money
                  value={a.balance}
                  currency={a.currency}
                  className="text-muted-foreground text-[11px]"
                />
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-expense mt-1.5 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
