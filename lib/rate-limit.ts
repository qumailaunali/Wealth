import "server-only";
import { headers } from "next/headers";

/**
 * Simple fixed-window, in-memory rate limiter.
 * LIMITATION: state lives in the Node process, so it resets on restart and is not shared
 * between multiple instances / serverless invocations. Swap for Redis/Upstash in production
 * deployments that scale horizontally.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const g = globalThis as unknown as { __rateLimit?: Map<string, Bucket> };
const store = (g.__rateLimit ??= new Map<string, Bucket>());

function current(key: string, now = Date.now()): Bucket | undefined {
  const bucket = store.get(key);
  if (bucket && bucket.resetAt <= now) {
    store.delete(key);
    return undefined;
  }
  return bucket;
}

/** Record one attempt. */
export function hit(key: string, windowMs: number) {
  const now = Date.now();
  if (store.size > 10_000) {
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
  }
  const bucket = current(key, now);
  if (bucket) bucket.count++;
  else store.set(key, { count: 1, resetAt: now + windowMs });
}

/** True when the key has already used up its allowance (does not record an attempt). */
export function isLimited(key: string, limit: number): boolean {
  return (current(key)?.count ?? 0) >= limit;
}

/** Check-and-record in one step (for actions where every attempt counts, e.g. sign-ups). */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean } {
  if (isLimited(key, limit)) return { ok: false };
  hit(key, windowMs);
  return { ok: true };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
