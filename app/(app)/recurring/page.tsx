import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { RecurringManager } from "@/components/recurring/recurring-manager";
import { getRecurringRules } from "@/lib/queries/recurring";

export const metadata: Metadata = { title: "Recurring" };

export default async function RecurringPage() {
  const rules = await getRecurringRules();
  return (
    <>
      <PageHeader title="Recurring" subtitle="Rent, salary, subscriptions" backHref="/more" />
      <RecurringManager rules={rules} />
    </>
  );
}
