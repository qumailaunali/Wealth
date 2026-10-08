"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { TxType } from "@/lib/types";

/** Full-page add form, used by the home-screen shortcuts (Add expense / income / transfer). */
export function NewTransaction({ type }: { type: TxType }) {
  const router = useRouter();
  return (
    <div className="flex h-[calc(100dvh-max(env(safe-area-inset-top),12px)-env(safe-area-inset-bottom)-6rem)] min-h-[560px] flex-col lg:h-[calc(100dvh-5rem)]">
      <PageHeader title="Add transaction" backHref="/" className="pb-2" />
      <div className="bg-card -mx-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl border-t pt-4 sm:mx-0 sm:rounded-3xl sm:border">
        <TransactionForm defaultType={type} onDone={() => router.replace("/")} />
      </div>
    </div>
  );
}
