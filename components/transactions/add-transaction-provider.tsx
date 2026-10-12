"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import type { TransactionView, TxType } from "@/lib/types";
import { TransactionForm } from "./transaction-form";

interface OpenOptions {
  type?: TxType;
  transaction?: TransactionView;
}

interface AddTransactionContextValue {
  open: (options?: OpenOptions) => void;
}

const AddTransactionContext = createContext<AddTransactionContextValue | null>(null);

/** Global bottom sheet for adding/editing transactions (opened from the FAB, lists, shortcuts). */
export function AddTransactionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; options: OpenOptions; key: number }>({
    open: false,
    options: {},
    key: 0,
  });
  // Whether we pushed a history entry for the open sheet (so back closes it).
  const pushedEntry = useRef(false);
  const isOpen = useRef(false);

  const open = useCallback((options: OpenOptions = {}) => {
    isOpen.current = true;
    setState((s) => ({ open: true, options, key: s.key + 1 }));
    // Push a history entry so the Android system back button closes the sheet
    // instead of leaving the app. The router state is preserved.
    if (typeof window !== "undefined" && !pushedEntry.current) {
      window.history.pushState({ ...window.history.state, __txSheet: true }, "");
      pushedEntry.current = true;
    }
  }, []);
  const close = useCallback(() => {
    if (!isOpen.current) return;
    isOpen.current = false;
    setState((s) => ({ ...s, open: false }));
    // Drop the entry we pushed so a later back press behaves normally.
    if (pushedEntry.current && typeof window !== "undefined") {
      pushedEntry.current = false;
      window.history.back();
    }
  }, []);

  // System back button while the sheet is open: the browser already popped our
  // entry — just close the sheet and stay on the page.
  useEffect(() => {
    const onPopState = () => {
      if (pushedEntry.current) {
        pushedEntry.current = false;
        isOpen.current = false;
        setState((s) => (s.open ? { ...s, open: false } : s));
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const value = useMemo(() => ({ open }), [open]);
  const editing = state.options.transaction;

  return (
    <AddTransactionContext.Provider value={value}>
      {children}
      <Drawer open={state.open} onOpenChange={(o) => (o ? null : close())} repositionInputs={false}>
        <DrawerContent className="h-[92dvh] lg:h-[86dvh]">
          <DrawerTitle className="sr-only">
            {editing ? "Edit transaction" : "Add transaction"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Enter the amount with the keypad, pick a category and account, then save.
          </DrawerDescription>
          <div className="flex min-h-0 flex-1 flex-col pt-3">
            <TransactionForm
              key={state.key}
              initial={editing}
              defaultType={state.options.type}
              onDone={close}
              active={state.open}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </AddTransactionContext.Provider>
  );
}

export function useAddTransaction() {
  const ctx = useContext(AddTransactionContext);
  if (!ctx) throw new Error("useAddTransaction must be used inside AddTransactionProvider");
  return ctx;
}
