/** Serializable view models passed from server to client components. Money is in minor units. */

export type TxType = "EXPENSE" | "INCOME" | "TRANSFER";
export type CatType = "EXPENSE" | "INCOME";
export type AccountTypeName =
  "CASH" | "BANK" | "MOBILE_WALLET" | "CREDIT_CARD" | "SAVINGS" | "OTHER";

export interface AccountView {
  id: string;
  name: string;
  type: AccountTypeName;
  currency: string;
  openingBalance: number;
  balance: number;
  color: string;
  icon: string;
  includeInTotal: boolean;
  isArchived: boolean;
  note: string | null;
}

export interface CategoryView {
  id: string;
  name: string;
  type: CatType;
  icon: string;
  color: string;
  parentId: string | null;
  monthlyBudget: number | null;
  isArchived: boolean;
}

export interface TransactionView {
  id: string;
  type: TxType;
  amount: number;
  toAmount: number | null;
  currency: string;
  toCurrency: string | null;
  occurredAt: string;
  title: string;
  note: string | null;
  receiptUrl: string | null;
  recurringRuleId: string | null;
  account: { id: string; name: string; color: string; icon: string };
  toAccount: { id: string; name: string; color: string; icon: string } | null;
  category: { id: string; name: string; color: string; icon: string } | null;
  tags: string[];
}

export interface DayTotal {
  income: number;
  expense: number;
}

export interface TransactionPage {
  items: TransactionView[];
  nextCursor: string | null;
  /** Totals per yyyy-MM-dd (user timezone) for the days in this page, in the default currency */
  dayTotals: Record<string, DayTotal>;
}

export interface UserPrefs {
  name: string;
  email: string;
  defaultCurrency: string;
  locale: string;
  weekStart: number;
  timezone: string;
  theme: "dark" | "light";
}
