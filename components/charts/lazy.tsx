"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts is heavy — load it on the client only, after the page shell renders.
export const SpendingDonut = dynamic(() => import("./charts").then((m) => m.SpendingDonut), {
  ssr: false,
  loading: () => <Skeleton className="mx-auto aspect-square w-full max-w-[220px] rounded-full" />,
});

export const TrendChart = dynamic(() => import("./charts").then((m) => m.TrendChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[180px] w-full rounded-xl" />,
});

export const IncomeExpenseChart = dynamic(
  () => import("./charts").then((m) => m.IncomeExpenseChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full rounded-xl" />,
  },
);
