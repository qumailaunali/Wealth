import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="relative mb-5">
        <div
          aria-hidden="true"
          className="bg-primary/10 absolute inset-0 scale-150 rounded-full blur-2xl"
        />
        <div className="bg-surface-2 text-primary relative flex size-16 items-center justify-center rounded-2xl border">
          <Icon className="size-7" aria-hidden="true" />
        </div>
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mt-1.5 max-w-xs text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
