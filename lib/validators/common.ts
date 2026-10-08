import { z } from "zod";

// Avoid Zod's eval-based fast path: it would trip our CSP (no unsafe-eval).
z.config({ jitless: true });
import { MAX_MAJOR_DIGITS } from "@/lib/money";

export const idSchema = z.string().min(1).max(64);

export const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a colour");

export const iconSchema = z.string().min(1).max(40);

/** Decimal amount string as typed by the user. Converted to minor units on the server. */
export const amountString = z
  .string()
  .trim()
  .min(1, "Enter an amount")
  .regex(new RegExp(`^\\d{1,${MAX_MAJOR_DIGITS}}(\\.\\d{0,3})?$`), "Enter a valid amount");

/** Like amountString, but allows a leading minus (opening balances, e.g. card debt). */
export const signedAmountString = z
  .string()
  .trim()
  .regex(new RegExp(`^-?\\d{1,${MAX_MAJOR_DIGITS}}(\\.\\d{0,3})?$`), "Enter a valid amount");

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export type ActionFailure = { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type ActionResult<T = undefined> = { ok: true; data: T } | ActionFailure;

export function zodFail(error: z.ZodError): ActionFailure {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: error.issues[0]?.message ?? "Invalid input", fieldErrors };
}
