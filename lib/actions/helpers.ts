import "server-only";
import { revalidatePath } from "next/cache";
import { NotFoundError } from "@/lib/dal";
import type { ActionFailure, ActionResult } from "@/lib/validators/common";

/** Convert known domain errors into typed action failures; rethrow everything else (incl. redirects). */
export async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof NotFoundError) return { ok: false, error: error.message };
    throw error;
  }
}

/** Balances and summaries appear on almost every screen, so refresh the whole app shell. */
export function revalidateApp() {
  revalidatePath("/", "layout");
}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionFailure {
  return { ok: false, error, fieldErrors };
}
