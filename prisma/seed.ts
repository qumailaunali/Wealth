/**
 * Demo data: `pnpm db:seed`
 * Creates demo@wealth.app / demo12345 with accounts, categories (incl. sub-categories and budgets),
 * ~65 realistic transactions over the last ~10 weeks, transfers and recurring rules.
 * Re-running the seed replaces the demo user (other users are untouched).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES } from "../lib/constants";
import { PrismaClient } from "../lib/generated/prisma/client";

const DEMO_EMAIL = "demo@wealth.app";
const DEMO_PASSWORD = "demo12345";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Deterministic PRNG so the demo looks the same every time.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
/** PKR amount in paisa, rounded to whole rupees (or tens) for realism */
const rs = (min: number, max: number, step = 10) =>
  BigInt(Math.round(between(min, max) / step) * step * 100);

function daysAgo(days: number, hour = between(8, 22), minute = between(0, 59)) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  // Hours given in Pakistan time (UTC+5)
  d.setUTCHours(hour - 5, minute, 0, 0);
  return d;
}

async function main() {
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await db.user.create({
    data: {
      name: "Ayesha Khan",
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      defaultCurrency: "PKR",
      locale: "en-PK",
      timezone: "Asia/Karachi",
    },
  });

  // ---- Categories ----
  const cats: Record<string, string> = {};
  for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
    const budget: Record<string, number> = {
      Food: 45_000,
      Transport: 15_000,
      Shopping: 20_000,
      Entertainment: 8_000,
    };
    const created = await db.category.create({
      data: {
        ...c,
        userId: user.id,
        sortOrder: i,
        monthlyBudget:
          c.type === "EXPENSE" && budget[c.name] ? BigInt(budget[c.name]! * 100) : null,
      },
    });
    cats[`${c.type}:${c.name}`] = created.id;
  }
  const sub = async (parent: string, name: string, icon: string, color: string) => {
    const created = await db.category.create({
      data: {
        userId: user.id,
        parentId: cats[`EXPENSE:${parent}`],
        name,
        type: "EXPENSE",
        icon,
        color,
      },
    });
    cats[`EXPENSE:${name}`] = created.id;
  };
  await sub("Food", "Groceries", "shopping-cart", "#F59E0B");
  await sub("Food", "Dining out", "coffee", "#F97316");
  await sub("Transport", "Fuel", "fuel", "#3B82F6");
  await sub("Bills", "Internet", "wifi", "#EAB308");
  await sub("Bills", "Electricity", "zap", "#EAB308");

  // ---- Accounts ----
  const acc = async (
    name: string,
    type: "CASH" | "BANK" | "MOBILE_WALLET" | "CREDIT_CARD" | "SAVINGS",
    opening: number,
    color: string,
    icon: string,
    currency = "PKR",
    sortOrder = 0,
  ) =>
    (
      await db.account.create({
        data: {
          userId: user.id,
          name,
          type,
          currency,
          openingBalance: BigInt(opening * 100),
          color,
          icon,
          sortOrder,
        },
      })
    ).id;

  const cash = await acc("Cash", "CASH", 12_000, "#10B981", "banknote", "PKR", 0);
  const bank = await acc("Meezan Bank", "BANK", 185_000, "#3B82F6", "landmark", "PKR", 1);
  const wallet = await acc("JazzCash", "MOBILE_WALLET", 6_500, "#F43F5E", "smartphone", "PKR", 2);
  const card = await acc("HBL Credit Card", "CREDIT_CARD", 0, "#8B5CF6", "credit-card", "PKR", 3);
  const savings = await acc("Savings", "SAVINGS", 250_000, "#14B8A6", "piggy-bank", "PKR", 4);
  const usd = await acc("Payoneer", "BANK", 420, "#F97316", "hand-coins", "USD", 5);

  type Tx = {
    type: "EXPENSE" | "INCOME" | "TRANSFER";
    amount: bigint;
    toAmount?: bigint;
    accountId: string;
    toAccountId?: string;
    category?: string;
    title: string;
    occurredAt: Date;
    note?: string;
  };
  const txs: Tx[] = [];
  const expense = (
    category: string,
    title: string,
    amount: bigint,
    accountId: string,
    occurredAt: Date,
  ) =>
    txs.push({
      type: "EXPENSE",
      category: `EXPENSE:${category}`,
      title,
      amount,
      accountId,
      occurredAt,
    });

  // Monthly income & bills for the current and previous two months
  for (const m of [0, 1, 2]) {
    const base = m * 30;
    if (base + 1 <= 70) {
      txs.push({
        type: "INCOME",
        category: "INCOME:Salary",
        title: "Monthly salary",
        amount: 285_000_00n,
        accountId: bank,
        occurredAt: daysAgo(base + 1, 10, 5),
      });
    }
    expense("Rent", "Apartment rent", 75_000_00n, bank, daysAgo(base + 2, 11, 0));
    expense("Internet", "Nayatel", 4_500_00n, bank, daysAgo(base + 4, 9, 30));
    expense(
      "Electricity",
      "K-Electric bill",
      rs(9_000, 16_000, 100),
      wallet,
      daysAgo(base + 6, 19, 15),
    );
    expense("Entertainment", "Netflix", 1_100_00n, card, daysAgo(base + 8, 21, 0));
    txs.push({
      type: "TRANSFER",
      title: "Monthly savings",
      amount: 40_000_00n,
      toAmount: 40_000_00n,
      accountId: bank,
      toAccountId: savings,
      occurredAt: daysAgo(base + 3, 12, 0),
    });
  }

  // Freelance income in USD
  txs.push({
    type: "INCOME",
    category: "INCOME:Business",
    title: "Upwork payout",
    amount: 650_00n,
    accountId: usd,
    occurredAt: daysAgo(12, 16, 40),
  });
  txs.push({
    type: "INCOME",
    category: "INCOME:Business",
    title: "Logo design client",
    amount: 35_000_00n,
    accountId: wallet,
    occurredAt: daysAgo(26, 14, 10),
  });
  txs.push({
    type: "INCOME",
    category: "INCOME:Gift",
    title: "Eid gift from Nani",
    amount: 10_000_00n,
    accountId: cash,
    occurredAt: daysAgo(40, 13, 0),
  });

  // Everyday spending
  const groceries = ["Imtiaz Supermarket", "Al-Fatah", "Carrefour", "Naheed", "Chase Up"];
  const dining = [
    "Cafe Aylanto",
    "Kolachi",
    "Butlers Chocolate Cafe",
    "Savour Foods",
    "Burger Lab",
    "Chaaye Khana",
  ];
  const rides = ["Careem", "inDrive", "Uber", "Yango"];
  const shops = ["Daraz", "Khaadi", "Outfitters", "Sapphire", "Hush Puppies"];
  for (let i = 0; i < 9; i++)
    expense(
      "Groceries",
      pick(groceries),
      rs(2_500, 9_500),
      pick([card, bank, cash]),
      daysAgo(between(0, 68)),
    );
  for (let i = 0; i < 10; i++)
    expense(
      "Dining out",
      pick(dining),
      rs(900, 5_500),
      pick([card, wallet, cash]),
      daysAgo(between(0, 68), between(13, 23)),
    );
  for (let i = 0; i < 9; i++)
    expense(
      "Transport",
      pick(rides),
      rs(350, 1_600),
      pick([wallet, cash]),
      daysAgo(between(0, 68)),
    );
  for (let i = 0; i < 3; i++)
    expense("Fuel", "PSO petrol", rs(4_000, 7_000, 100), cash, daysAgo(between(0, 68)));
  for (let i = 0; i < 5; i++)
    expense("Shopping", pick(shops), rs(1_800, 12_000, 100), card, daysAgo(between(0, 68)));
  expense("Health", "Dr. Essa Lab", 3_200_00n, cash, daysAgo(18));
  expense("Health", "Pharmacy", 1_450_00n, cash, daysAgo(5));
  expense("Education", "Coursera subscription", 14_00n, usd, daysAgo(9));
  expense("Entertainment", "Cinepax tickets", 2_400_00n, card, daysAgo(14, 20, 30));
  expense("Other", "Haircut", 1_200_00n, cash, daysAgo(22));
  // Today
  expense("Dining out", "Chai & paratha", 450_00n, cash, daysAgo(0, 9, 10));
  expense("Transport", "Careem", 680_00n, wallet, daysAgo(0, 9, 40));

  // Transfers: top up wallet, pay card bill, withdraw cash
  txs.push({
    type: "TRANSFER",
    title: "JazzCash top-up",
    amount: 15_000_00n,
    toAmount: 15_000_00n,
    accountId: bank,
    toAccountId: wallet,
    occurredAt: daysAgo(20, 18, 0),
  });
  txs.push({
    type: "TRANSFER",
    title: "Card bill payment",
    amount: 30_000_00n,
    toAmount: 30_000_00n,
    accountId: bank,
    toAccountId: card,
    occurredAt: daysAgo(25, 12, 30),
  });
  txs.push({
    type: "TRANSFER",
    title: "ATM withdrawal",
    amount: 20_000_00n,
    toAmount: 20_000_00n,
    accountId: bank,
    toAccountId: cash,
    occurredAt: daysAgo(11, 17, 45),
  });
  txs.push({
    type: "TRANSFER",
    title: "Payoneer to Meezan",
    amount: 300_00n,
    toAmount: 83_400_00n,
    accountId: usd,
    toAccountId: bank,
    occurredAt: daysAgo(30, 15, 0),
    note: "Rate 278",
  });

  await db.transaction.createMany({
    data: txs.map((t) => ({
      userId: user.id,
      type: t.type,
      amount: t.amount,
      toAmount: t.type === "TRANSFER" ? (t.toAmount ?? t.amount) : null,
      accountId: t.accountId,
      toAccountId: t.toAccountId ?? null,
      categoryId: t.category ? cats[t.category] : null,
      title: t.title,
      note: t.note ?? null,
      occurredAt: t.occurredAt,
    })),
  });

  // Tags on a couple of transactions
  const tag = await db.tag.create({ data: { userId: user.id, name: "weekend" } });
  const someDining = await db.transaction.findMany({
    where: { userId: user.id, categoryId: cats["EXPENSE:Dining out"] },
    take: 3,
  });
  await db.transactionTag.createMany({
    data: someDining.map((t) => ({ transactionId: t.id, tagId: tag.id })),
  });

  // Recurring rules (next occurrences are in the future so seeding doesn't double-generate)
  const nextMonth = (day: number, hour: number) => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() + 1, day);
    d.setUTCHours(hour - 5, 0, 0, 0);
    return d;
  };
  await db.recurringRule.createMany({
    data: [
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 75_000_00n,
        accountId: bank,
        categoryId: cats["EXPENSE:Rent"],
        title: "Apartment rent",
        frequency: "MONTHLY",
        interval: 1,
        startAt: nextMonth(1, 11),
        nextRunAt: nextMonth(1, 11),
      },
      {
        userId: user.id,
        type: "INCOME",
        amount: 285_000_00n,
        accountId: bank,
        categoryId: cats["INCOME:Salary"],
        title: "Monthly salary",
        frequency: "MONTHLY",
        interval: 1,
        startAt: nextMonth(1, 10),
        nextRunAt: nextMonth(1, 10),
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 1_100_00n,
        accountId: card,
        categoryId: cats["EXPENSE:Entertainment"],
        title: "Netflix",
        frequency: "MONTHLY",
        interval: 1,
        startAt: nextMonth(8, 21),
        nextRunAt: nextMonth(8, 21),
      },
    ],
  });

  console.log(`✔ Seeded ${txs.length} transactions for ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
