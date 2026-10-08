import type { Metadata } from "next";
import { NewTransaction } from "./new-transaction";

export const metadata: Metadata = { title: "Add transaction" };

const TYPES = { expense: "EXPENSE", income: "INCOME", transfer: "TRANSFER" } as const;

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).type;
  const key = (Array.isArray(raw) ? raw[0] : raw)?.toLowerCase() as keyof typeof TYPES | undefined;
  return <NewTransaction type={(key && TYPES[key]) || "EXPENSE"} />;
}
