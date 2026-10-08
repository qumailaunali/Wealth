/**
 * Tiny IndexedDB queue for transactions created while offline.
 * Each item carries a client-generated UUID that the server uses as an idempotency key,
 * so replaying the queue can never create duplicates.
 */
import type { TransactionInput } from "@/lib/validators/finance";

const DB_NAME = "wealth-offline";
const STORE = "pending-transactions";

export interface QueuedTransaction {
  clientId: string;
  input: TransactionInput;
  queuedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "clientId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const QUEUE_EVENT = "wealth:queue-changed";

function notify() {
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export async function enqueueTransaction(input: TransactionInput): Promise<QueuedTransaction> {
  const clientId = input.clientId ?? crypto.randomUUID();
  const item: QueuedTransaction = { clientId, input: { ...input, clientId }, queuedAt: Date.now() };
  await withStore("readwrite", (s) => s.put(item));
  notify();
  return item;
}

export async function listQueued(): Promise<QueuedTransaction[]> {
  if (typeof indexedDB === "undefined") return [];
  return withStore("readonly", (s) => s.getAll() as IDBRequest<QueuedTransaction[]>);
}

export async function removeQueued(clientId: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(clientId));
  notify();
}

/** True for errors caused by the network (server action fetch failed), not by validation. */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return (
    error instanceof TypeError ||
    (error instanceof Error && /fetch|network|load failed/i.test(error.message))
  );
}
