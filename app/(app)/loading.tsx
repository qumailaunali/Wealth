import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="grid grid-cols-1 gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between pt-2">
        <div className="grid grid-cols-1 gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-36" />
        </div>
        <Skeleton className="size-11 rounded-full" />
      </div>
      <Skeleton className="h-44 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-[118px] w-[164px] shrink-0 rounded-2xl" />
        <Skeleton className="h-[118px] w-[164px] shrink-0 rounded-2xl" />
        <Skeleton className="h-[118px] w-[164px] shrink-0 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}
