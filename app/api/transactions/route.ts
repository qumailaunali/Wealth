import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { listTransactions } from "@/lib/queries/transactions";
import { parseFilters } from "@/lib/validators/finance";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const cursor = params.get("cursor");
  const page = await listTransactions(
    parseFilters(params),
    cursor && cursor.length <= 64 ? cursor : null,
  );
  return NextResponse.json(page, { headers: { "Cache-Control": "private, no-store" } });
}
