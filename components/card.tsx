import { cn } from "@/lib/utils";

export function Card({
  title,
  action,
  className,
  children,
  id,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const headingId =
    id ?? (title ? `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined);
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cn("bg-card rounded-3xl border p-4 sm:p-5", className)}
    >
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 id={headingId} className="text-base font-semibold">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
