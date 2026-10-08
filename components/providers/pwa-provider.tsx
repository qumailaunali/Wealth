"use client";

import { Serwist } from "@serwist/window";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import { createTransaction } from "@/lib/actions/transactions";
import { isNetworkError, listQueued, QUEUE_EVENT, removeQueued } from "@/lib/offline-queue";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaContextValue {
  online: boolean;
  pendingCount: number;
  canInstall: boolean;
  isStandalone: boolean;
  isIos: boolean;
  promptInstall: () => Promise<boolean>;
  syncNow: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue | null>(null);

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

const subscribeNoop = () => () => {};

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const isStandalone = useSyncExternalStore(
    subscribeNoop,
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
  const isIos = useSyncExternalStore(
    subscribeNoop,
    () =>
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    () => false,
  );
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Service worker registration + "update available" flow (production only).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = new Serwist("/sw.js", { scope: "/", type: "classic" });
    sw.addEventListener("waiting", () => {
      toast("Update available", {
        description: "A new version of Wealth is ready.",
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => {
            sw.addEventListener("controlling", () => window.location.reload());
            sw.messageSkipWaiting();
          },
        },
      });
    });
    void sw.register();
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      toast.success("Wealth installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const refreshPending = useCallback(async () => {
    try {
      setPendingCount((await listQueued()).length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    const items = await listQueued().catch(() => []);
    if (!items.length) return;
    let synced = 0;
    for (const item of items) {
      try {
        const res = await createTransaction(item.input);
        if (res.ok) synced++;
        else toast.error(`Couldn't sync an offline transaction: ${res.error}`);
        // Validation failures are surfaced, then dropped to avoid an endless retry loop.
        await removeQueued(item.clientId);
      } catch (error) {
        if (isNetworkError(error)) break; // still offline — keep everything queued
        throw error;
      }
    }
    if (synced) {
      toast.success(`Synced ${synced} offline transaction${synced === 1 ? "" : "s"}`);
      router.refresh();
    }
    await refreshPending();
  }, [refreshPending, router]);

  useEffect(() => {
    // Initial read of the queue and sync attempt when the app opens.
    const init = async () => {
      await refreshPending();
      await syncNow();
    };
    void init();
    const onChange = () => void refreshPending();
    const onOnline = () => void syncNow();
    window.addEventListener(QUEUE_EVENT, onChange);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener(QUEUE_EVENT, onChange);
      window.removeEventListener("online", onOnline);
    };
  }, [refreshPending, syncNow]);

  const promptInstall = useCallback(async () => {
    if (!installEvent) return false;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    return choice.outcome === "accepted";
  }, [installEvent]);

  const value = useMemo(
    () => ({
      online,
      pendingCount,
      canInstall: Boolean(installEvent),
      isStandalone,
      isIos,
      promptInstall,
      syncNow,
    }),
    [online, pendingCount, installEvent, isStandalone, isIos, promptInstall, syncNow],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error("usePwa must be used inside PwaProvider");
  return ctx;
}
