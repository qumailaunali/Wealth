import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { processDueRecurring } from "@/lib/queries/recurring";

/**
 * Optional cron hook: generates due recurring transactions for every user.
 * Not required — rules are also processed whenever a user opens the app.
 * Call with `Authorization: Bearer $CRON_SECRET` (e.g. Vercel Cron, GitHub Actions, crontab + curl).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    header.length !== expected.length ||
    !timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await db.recurringRule.findMany({
    where: { isActive: true, nextRunAt: { lte: new Date() } },
    distinct: ["userId"],
    select: { user: { select: { id: true, timezone: true } } },
    take: 500,
  });
  let created = 0;
  for (const { user } of due) created += await processDueRecurring(user.id, user.timezone);
  return NextResponse.json({ users: due.length, created });
}
