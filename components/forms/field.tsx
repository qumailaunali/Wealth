import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + inline error, wired up for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="text-muted-foreground text-sm font-medium">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-expense text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Props to spread on an input so it is linked to its Field error. */
export function fieldA11y(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}

/** Apply server-side field errors to react-hook-form. */
export function applyFieldErrors<T extends string>(
  fieldErrors: Record<string, string[]> | undefined,
  setError: (name: T, error: { message: string }) => void,
) {
  if (!fieldErrors) return;
  for (const [name, messages] of Object.entries(fieldErrors)) {
    if (messages[0]) setError(name as T, { message: messages[0] });
  }
}
