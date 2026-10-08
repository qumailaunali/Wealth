export const APP_NAME = "Wealth";
export const APP_DESCRIPTION =
  "Track income, expenses and balances across all your accounts. A fast, private personal finance app.";
export const THEME_BG = "#0B0D12";

export const ACCOUNT_TYPES = [
  { value: "CASH", label: "Cash", icon: "banknote" },
  { value: "BANK", label: "Bank", icon: "landmark" },
  { value: "MOBILE_WALLET", label: "Mobile Wallet", icon: "smartphone" },
  { value: "CREDIT_CARD", label: "Credit Card", icon: "credit-card" },
  { value: "SAVINGS", label: "Savings", icon: "piggy-bank" },
  { value: "OTHER", label: "Other", icon: "wallet" },
] as const;

export type AccountTypeValue = (typeof ACCOUNT_TYPES)[number]["value"];

export function accountTypeLabel(type: string): string {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Curated palette — all pass AA as icon/badge colours on the dark surfaces. */
export const COLORS = [
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#64748B",
  "#A8A29E",
] as const;

export const TRANSACTION_TYPES = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
  { value: "TRANSFER", label: "Transfer" },
] as const;

export type TransactionTypeValue = (typeof TRANSACTION_TYPES)[number]["value"];

export const DEFAULT_CATEGORIES: {
  name: string;
  type: "EXPENSE" | "INCOME";
  icon: string;
  color: string;
}[] = [
  { name: "Food", type: "EXPENSE", icon: "utensils", color: "#F97316" },
  { name: "Transport", type: "EXPENSE", icon: "car", color: "#3B82F6" },
  { name: "Bills", type: "EXPENSE", icon: "receipt", color: "#EAB308" },
  { name: "Shopping", type: "EXPENSE", icon: "shopping-bag", color: "#EC4899" },
  { name: "Health", type: "EXPENSE", icon: "heart-pulse", color: "#F43F5E" },
  { name: "Entertainment", type: "EXPENSE", icon: "clapperboard", color: "#8B5CF6" },
  { name: "Education", type: "EXPENSE", icon: "graduation-cap", color: "#06B6D4" },
  { name: "Rent", type: "EXPENSE", icon: "house", color: "#6366F1" },
  { name: "Other", type: "EXPENSE", icon: "circle-ellipsis", color: "#64748B" },
  { name: "Salary", type: "INCOME", icon: "briefcase", color: "#10B981" },
  { name: "Business", type: "INCOME", icon: "store", color: "#14B8A6" },
  { name: "Gift", type: "INCOME", icon: "gift", color: "#D946EF" },
  { name: "Other", type: "INCOME", icon: "circle-ellipsis", color: "#84CC16" },
];

export const PAGE_SIZE = 30;
