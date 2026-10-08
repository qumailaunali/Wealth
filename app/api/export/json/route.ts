import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { formatInTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { bigToMinor } from "@/lib/money";

/** Full data export (all records owned by the user). Money values are in minor units. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = { userId: user.id };
  const [accounts, categories, transactions, recurring, tags] = await Promise.all([
    db.account.findMany({ where }),
    db.category.findMany({ where }),
    db.transaction.findMany({
      where,
      include: { tags: { select: { tag: { select: { name: true } } } } },
      orderBy: { occurredAt: "asc" },
    }),
    db.recurringRule.findMany({ where }),
    db.tag.findMany({ where }),
  ]);

  const strip = <T extends { userId: string }>({ userId: _userId, ...rest }: T) => rest;
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "Wealth",
      version: 1,
      note: "Amounts are integers in each currency's minor unit (e.g. paisa).",
      profile: {
        name: user.name,
        email: user.email,
        defaultCurrency: user.defaultCurrency,
        locale: user.locale,
        timezone: user.timezone,
        weekStart: user.weekStart,
      },
      accounts: accounts.map((a) => ({
        ...strip(a),
        openingBalance: bigToMinor(a.openingBalance),
      })),
      categories: categories.map((c) => ({
        ...strip(c),
        monthlyBudget: c.monthlyBudget === null ? null : bigToMinor(c.monthlyBudget),
      })),
      transactions: transactions.map((t) => ({
        ...strip(t),
        amount: bigToMinor(t.amount),
        toAmount: t.toAmount === null ? null : bigToMinor(t.toAmount),
        tags: t.tags.map((x) => x.tag.name),
      })),
      recurringRules: recurring.map((r) => ({
        ...strip(r),
        amount: bigToMinor(r.amount),
        toAmount: r.toAmount === null ? null : bigToMinor(r.toAmount),
      })),
      tags: tags.map(strip),
    },
    null,
    2,
  );

  const stamp = formatInTz(new Date(), "yyyy-MM-dd", user.timezone);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="wealth-export-${stamp}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
