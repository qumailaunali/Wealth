"use client";

import { createContext, useContext } from "react";
import type { AccountView, CategoryView, UserPrefs } from "@/lib/types";

export interface AppData {
  prefs: UserPrefs;
  accounts: AccountView[];
  categories: CategoryView[];
  tags: string[];
}

const AppDataContext = createContext<AppData | null>(null);

/** Server-fetched shell data (prefs, accounts, categories) shared with client components. */
export function AppDataProvider({
  value,
  children,
}: {
  value: AppData;
  children: React.ReactNode;
}) {
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}

export function usePrefs() {
  return useAppData().prefs;
}
