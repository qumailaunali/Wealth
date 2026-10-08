import type { Metadata } from "next";
import { CategoriesManager } from "@/components/categories/categories-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getCategoryUsage } from "@/lib/queries/categories";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const usage = await getCategoryUsage();
  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Tap a category to edit, budget or delete it"
        backHref="/more"
      />
      <CategoriesManager usage={usage} />
    </>
  );
}
