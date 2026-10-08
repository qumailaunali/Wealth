"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { IconBadge } from "@/components/app-icon";
import { applyFieldErrors, Field, fieldA11y } from "@/components/forms/field";
import { ColorPicker, IconPicker } from "@/components/forms/pickers";
import { usePrefs } from "@/components/providers/app-data";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createAccount, updateAccount } from "@/lib/actions/accounts";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { CURRENCIES } from "@/lib/currencies";
import { toInputString } from "@/lib/money";
import type { AccountView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type AccountInput, accountSchema } from "@/lib/validators/finance";

export function AccountFormSheet({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountView;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg">{account ? "Edit account" : "New account"}</DrawerTitle>
          <DrawerDescription>Where your money lives: cash, bank, wallet or card.</DrawerDescription>
        </DrawerHeader>
        {open ? <AccountForm account={account} onDone={() => onOpenChange(false)} /> : null}
      </DrawerContent>
    </Drawer>
  );
}

function AccountForm({ account, onDone }: { account?: AccountView; onDone: () => void }) {
  const prefs = usePrefs();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [owed, setOwed] = useState(account ? account.openingBalance < 0 : false);

  const form = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          currency: account.currency,
          openingBalance: toInputString(Math.abs(account.openingBalance), account.currency),
          color: account.color,
          icon: account.icon,
          includeInTotal: account.includeInTotal,
          note: account.note ?? "",
        }
      : {
          name: "",
          type: "BANK",
          currency: prefs.defaultCurrency,
          openingBalance: "0",
          color: "#3B82F6",
          icon: "landmark",
          includeInTotal: true,
          note: "",
        },
  });
  const { errors } = form.formState;
  const [color, icon, type, name] = useWatch({
    control: form.control,
    name: ["color", "icon", "type", "name"],
  });

  const onSubmit = form.handleSubmit((values) => {
    const opening = values.openingBalance.replace(/^-/, "") || "0";
    const payload = {
      ...values,
      openingBalance: owed && opening !== "0" ? `-${opening}` : opening,
    };
    startTransition(async () => {
      const res = account ? await updateAccount(account.id, payload) : await createAccount(payload);
      if (!res.ok) {
        applyFieldErrors(res.fieldErrors, form.setError);
        toast.error(res.error);
        return;
      }
      toast.success(account ? "Account updated" : "Account created");
      onDone();
      if (!account) router.push(`/accounts/${res.data.id}`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-1 gap-5 overflow-y-auto px-4 pb-4">
        <div className="bg-surface-2/60 flex items-center gap-3 rounded-2xl p-3">
          <IconBadge name={icon} color={color} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{name || "Account name"}</p>
            <p className="text-muted-foreground text-xs">
              {ACCOUNT_TYPES.find((t) => t.value === type)?.label}
            </p>
          </div>
        </div>

        <Field id="acc-name" label="Name" error={errors.name?.message}>
          <Input
            {...fieldA11y("acc-name", errors.name?.message)}
            placeholder="e.g. Meezan Bank"
            {...form.register("name")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-2">
          <span className="text-muted-foreground text-sm font-medium" id="acc-type-label">
            Type
          </span>
          <div
            role="radiogroup"
            aria-labelledby="acc-type-label"
            className="grid grid-cols-3 gap-2"
          >
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={type === t.value}
                onClick={() => {
                  form.setValue("type", t.value);
                  form.setValue("icon", t.icon);
                  if (t.value === "CREDIT_CARD") setOwed(true);
                }}
                className={cn(
                  "pressable text-muted-foreground h-11 rounded-xl border px-2 text-xs font-semibold",
                  type === t.value && "border-primary/60 bg-primary/10 text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[7.5rem_1fr] gap-3">
          <Field id="acc-currency" label="Currency" error={errors.currency?.message}>
            <NativeSelect
              {...fieldA11y("acc-currency", errors.currency?.message)}
              {...form.register("currency")}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            id="acc-opening"
            label={account ? "Opening balance" : "Current balance"}
            error={errors.openingBalance?.message}
          >
            <Input
              {...fieldA11y("acc-opening", errors.openingBalance?.message)}
              inputMode="decimal"
              placeholder="0"
              {...form.register("openingBalance")}
            />
          </Field>
        </div>
        <label className="bg-surface-2/60 -mt-2 flex min-h-11 items-center justify-between gap-3 rounded-xl px-3.5">
          <span className="text-sm">
            This is money I owe <span className="text-muted-foreground">(e.g. card debt)</span>
          </span>
          <Switch checked={owed} onCheckedChange={setOwed} aria-label="Balance is owed" />
        </label>

        <div className="grid grid-cols-1 gap-2">
          <span className="text-muted-foreground text-sm font-medium">Colour</span>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <span className="text-muted-foreground text-sm font-medium">Icon</span>
          <Controller
            control={form.control}
            name="icon"
            render={({ field }) => (
              <IconPicker value={field.value} onChange={field.onChange} color={color} />
            )}
          />
        </div>

        <label className="bg-surface-2/60 flex min-h-11 items-center justify-between gap-3 rounded-xl px-3.5">
          <span className="text-sm">Include in total balance</span>
          <Controller
            control={form.control}
            name="includeInTotal"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Include in total balance"
              />
            )}
          />
        </label>

        <Field id="acc-note" label="Note (optional)" error={errors.note?.message}>
          <Textarea
            id="acc-note"
            rows={2}
            placeholder="Account number, branch…"
            {...form.register("note")}
          />
        </Field>
      </div>
      <div className="border-t p-4">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {account ? "Save changes" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
