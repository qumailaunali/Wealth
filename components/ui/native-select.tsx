import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native <select> styled like the inputs — uses the OS picker on mobile, which is faster to use. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "border-input bg-surface-2/60 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-11 w-full appearance-none rounded-xl border pr-10 pl-3.5 text-base outline-none focus-visible:ring-[3px] disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
    </div>
  );
}
