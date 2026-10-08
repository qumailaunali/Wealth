import { z } from "zod";
import { CURRENCY_CODES, LOCALE_VALUES } from "@/lib/currencies";
import {
  amountString,
  colorSchema,
  iconSchema,
  idSchema,
  optionalText,
  signedAmountString,
} from "./common";

// ---------- Accounts ----------
export const accountTypeEnum = z.enum([
  "CASH",
  "BANK",
  "MOBILE_WALLET",
  "CREDIT_CARD",
  "SAVINGS",
  "OTHER",
]);

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Keep it under 40 characters"),
  type: accountTypeEnum,
  currency: z.enum(CURRENCY_CODES),
  openingBalance: signedAmountString,
  color: colorSchema,
  icon: iconSchema,
  includeInTotal: z.boolean(),
  note: optionalText(200),
});
export type AccountInput = z.input<typeof accountSchema>;

// ---------- Categories ----------
export const categoryTypeEnum = z.enum(["EXPENSE", "INCOME"]);

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(30, "Keep it under 30 characters"),
  type: categoryTypeEnum,
  icon: iconSchema,
  color: colorSchema,
  parentId: idSchema.optional().nullable(),
  monthlyBudget: z.union([amountString, z.literal("")]).optional(),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const deleteCategorySchema = z.object({
  id: idSchema,
  /** Move existing transactions to this category; required when the category is in use */
  reassignTo: idSchema.optional(),
});

// ---------- Transactions ----------
export const transactionTypeEnum = z.enum(["EXPENSE", "INCOME", "TRANSFER"]);

const transactionBase = z.object({
  type: transactionTypeEnum,
  amount: amountString,
  /** Only for transfers between accounts with different currencies */
  toAmount: z.union([amountString, z.literal("")]).optional(),
  accountId: idSchema,
  toAccountId: idSchema.optional().nullable(),
  categoryId: idSchema.optional().nullable(),
  title: z.string().trim().max(80, "Keep it under 80 characters").optional().default(""),
  note: optionalText(500),
});

function refineTransaction(
  v: { type: string; accountId: string; toAccountId?: string | null; categoryId?: string | null },
  ctx: z.RefinementCtx,
) {
  if (v.type === "TRANSFER") {
    if (!v.toAccountId)
      ctx.addIssue({
        code: "custom",
        path: ["toAccountId"],
        message: "Choose a destination account",
      });
    else if (v.toAccountId === v.accountId)
      ctx.addIssue({
        code: "custom",
        path: ["toAccountId"],
        message: "Pick two different accounts",
      });
  } else if (!v.categoryId) {
    ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a category" });
  }
}

export const transactionSchema = transactionBase
  .extend({
    /** datetime-local string, interpreted in the user's timezone */
    occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a date and time"),
    tags: z.array(z.string().trim().min(1).max(24)).max(10).optional().default([]),
    receiptUrl: z.union([z.url({ protocol: /^https?$/ }).max(500), z.literal("")]).optional(),
    /** Idempotency key generated on the client (offline queue) */
    clientId: z.string().uuid().optional(),
  })
  .superRefine(refineTransaction);
export type TransactionInput = z.input<typeof transactionSchema>;

// ---------- Transaction filters (list, export) ----------
export const transactionFiltersSchema = z.object({
  q: z.string().trim().max(80).optional(),
  type: transactionTypeEnum.optional(),
  accountId: idSchema.optional(),
  categoryId: idSchema.optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  min: amountString.optional(),
  max: amountString.optional(),
});
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

/** Parse filters from URLSearchParams, dropping anything invalid instead of failing. */
export function parseFilters(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
) {
  const get = (k: string) => {
    const v = params instanceof URLSearchParams ? params.get(k) : params[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length ? s : undefined;
  };
  const out: TransactionFilters = {};
  for (const key of Object.keys(transactionFiltersSchema.shape) as (keyof TransactionFilters)[]) {
    const raw = get(key);
    if (raw === undefined) continue;
    const parsed = transactionFiltersSchema.shape[key].safeParse(raw);
    if (parsed.success && parsed.data !== undefined)
      (out as Record<string, string>)[key] = parsed.data;
  }
  return out;
}

// ---------- Recurring ----------
export const frequencyEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);

export const recurringSchema = transactionBase
  .extend({
    frequency: frequencyEnum,
    interval: z.coerce.number().int().min(1).max(365),
    startAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a start date"),
    endsAt: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
  })
  .superRefine(refineTransaction);
export type RecurringInput = z.input<typeof recurringSchema>;

// ---------- Settings ----------
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
});

export const preferencesSchema = z.object({
  defaultCurrency: z.enum(CURRENCY_CODES),
  locale: z.enum(LOCALE_VALUES),
  weekStart: z.coerce.number().int().min(0).max(6),
  timezone: z
    .string()
    .min(1)
    .max(64)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Unknown timezone"),
  theme: z.enum(["dark", "light"]),
});
export type PreferencesInput = z.input<typeof preferencesSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password"),
  confirm: z.literal("DELETE", { error: 'Type "DELETE" to confirm' }),
});
