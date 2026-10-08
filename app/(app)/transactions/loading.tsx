import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/transactions/transactions-view";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-4 pt-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <ListSkeleton />
    </div>
  );
}
