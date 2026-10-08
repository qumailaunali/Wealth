"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
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

  const open = useCallback((options: OpenOptions = {}) => {
    setState((s) => ({ open: true, options, key: s.key + 1 }));
  }, []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
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
