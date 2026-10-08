import type { Metadata } from "next";
import { Repeat } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ListSkeleton, TransactionsView } from "@/components/transactions/transactions-view";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="Transactions"
        actions={
          <Link
            href="/recurring"
            className="text-muted-foreground hover:bg-surface-2 hover:text-foreground flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium"
          >
            <Repeat className="size-4" aria-hidden="true" /> Recurring
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <TransactionsView />
      </Suspense>
    </>
  );
}
