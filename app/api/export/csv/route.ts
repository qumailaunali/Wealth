import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { getCurrentUser } from "@/lib/dal";
import { formatInTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { bigToMinor, toInputString } from "@/lib/money";
import { buildTransactionWhere } from "@/lib/queries/transactions";
import { parseFilters } from "@/lib/validators/finance";

/** Transactions as CSV, respecting the same filters as the list (type, account, category, dates, amounts, search). */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = await buildTransactionWhere(user, parseFilters(request.nextUrl.searchParams));
  const rows = await db.transaction.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: 50_000,
    include: {
      account: { select: { name: true, currency: true } },
      toAccount: { select: { name: true, currency: true } },
      category: { select: { name: true, parent: { select: { name: true } } } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  const csv = toCsv([
    [
      "Date",
      "Time",
      "Type",
      "Title",
      "Category",
      "Sub-category",
      "Account",
      "To account",
      "Amount",
      "Currency",
      "Received amount",
      "Received currency",
      "Tags",
      "Note",
    ],
    ...rows.map((t) => [
      formatInTz(t.occurredAt, "yyyy-MM-dd", user.timezone),
      formatInTz(t.occurredAt, "HH:mm", user.timezone),
      t.type.toLowerCase(),
      t.title,
      t.category?.parent?.name ?? t.category?.name ?? "",
      t.category?.parent ? t.category.name : "",
      t.account.name,
      t.toAccount?.name ?? "",
      (t.type === "EXPENSE" ? "-" : "") + toInputString(bigToMinor(t.amount), t.account.currency),
      t.account.currency,
      t.toAmount !== null && t.toAccount
        ? toInputString(bigToMinor(t.toAmount), t.toAccount.currency)
        : "",
      t.toAccount?.currency ?? "",
      t.tags.map((x) => x.tag.name).join(" "),
      t.note ?? "",
    ]),
  ]);

  const stamp = formatInTz(new Date(), "yyyy-MM-dd", user.timezone);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wealth-transactions-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
