import { describe, expect, it } from "vitest";
import { computeBalance, flowsFromLedger, type LedgerRow, totalsByCurrency } from "@/lib/balance";

const ledger: LedgerRow[] = [
  { type: "INCOME", accountId: "bank", toAccountId: null, amount: 100_000, toAmount: null },
  { type: "EXPENSE", accountId: "bank", toAccountId: null, amount: 25_000, toAmount: null },
  { type: "EXPENSE", accountId: "cash", toAccountId: null, amount: 1_500, toAmount: null },
  { type: "TRANSFER", accountId: "bank", toAccountId: "cash", amount: 10_000, toAmount: 10_000 },
  { type: "TRANSFER", accountId: "bank", toAccountId: "card", amount: 20_000, toAmount: 20_000 },
  { type: "EXPENSE", accountId: "card", toAccountId: null, amount: 30_000, toAmount: null },
  // Cross-currency transfer: 100.00 USD → 27,800.00 PKR
  { type: "TRANSFER", accountId: "usd", toAccountId: "bank", amount: 10_000, toAmount: 2_780_000 },
];

describe("balances", () => {
  const flows = flowsFromLedger(ledger);

  it("applies income, expenses and transfers", () => {
    // 50,000 opening + 100,000 − 25,000 − 10,000 − 20,000 + 2,780,000
    expect(computeBalance(50_000, flows.get("bank"))).toBe(2_875_000);
    expect(computeBalance(2_000, flows.get("cash"))).toBe(10_500);
    expect(computeBalance(50_000, flows.get("usd"))).toBe(40_000);
  });

  it("lets credit cards go negative", () => {
    expect(computeBalance(0, flows.get("card"))).toBe(-10_000);
  });

  it("returns the opening balance for accounts without activity", () => {
    expect(computeBalance(7_000, flows.get("unused"))).toBe(7_000);
  });

  it("same-currency transfers don't change net worth", () => {
    const before = totalsByCurrency([
      { currency: "PKR", balance: 1000, includeInTotal: true, isArchived: false },
      { currency: "PKR", balance: 500, includeInTotal: true, isArchived: false },
    ]);
    const f = flowsFromLedger([
      { type: "TRANSFER", accountId: "a", toAccountId: "b", amount: 300, toAmount: 300 },
    ]);
    const after = totalsByCurrency([
      {
        currency: "PKR",
        balance: computeBalance(1000, f.get("a")),
        includeInTotal: true,
        isArchived: false,
      },
      {
        currency: "PKR",
        balance: computeBalance(500, f.get("b")),
        includeInTotal: true,
        isArchived: false,
      },
    ]);
    expect(after).toEqual(before);
  });

  it("totals per currency and skips excluded/archived accounts", () => {
    expect(
      totalsByCurrency([
        { currency: "PKR", balance: 1000, includeInTotal: true, isArchived: false },
        { currency: "PKR", balance: -400, includeInTotal: true, isArchived: false },
        { currency: "PKR", balance: 9999, includeInTotal: false, isArchived: false },
        { currency: "PKR", balance: 9999, includeInTotal: true, isArchived: true },
        { currency: "USD", balance: 250, includeInTotal: true, isArchived: false },
      ]),
    ).toEqual({ PKR: 600, USD: 250 });
  });
});
