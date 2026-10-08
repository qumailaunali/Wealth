import { AlertTriangle, CircleAlert } from "lucide-react";
import { IconBadge } from "@/components/app-icon";
import { Money } from "@/components/money";
import { cn } from "@/lib/utils";

export interface BudgetItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  budget: number;
  spent: number;
  ratio: number;
}

export function BudgetList({ budgets, currency }: { budgets: BudgetItem[]; currency: string }) {
  return (
    <ul className="grid grid-cols-1 gap-4">
      {budgets.map((b) => {
        const over = b.ratio >= 1;
        const warn = !over && b.ratio >= 0.8;
        const left = b.budget - b.spent;
        return (
          <li key={b.id}>
            <div className="mb-2 flex items-center gap-3">
              <IconBadge name={b.icon} color={b.color} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {b.name}
                  {over ? (
                    <span className="bg-expense/15 text-expense inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      <CircleAlert className="size-3" aria-hidden="true" /> Over budget
                    </span>
                  ) : warn ? (
                    <span className="bg-warning/15 text-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      <AlertTriangle className="size-3" aria-hidden="true" />{" "}
                      {Math.round(b.ratio * 100)}% used
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  <Money value={b.spent} currency={currency} /> of{" "}
                  <Money value={b.budget} currency={currency} />
                </p>
              </div>
              <span
                className={cn(
                  "text-right text-xs",
                  over ? "text-expense" : "text-muted-foreground",
                )}
              >
                {over ? "Over by" : "Left"}
                <Money
                  value={Math.abs(left)}
                  currency={currency}
                  className="text-foreground block text-sm font-semibold"
                />
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${b.name} budget used`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.round(b.ratio * 100))}
              className="bg-surface-2 h-2 overflow-hidden rounded-full"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700",
                  over ? "bg-expense" : warn ? "bg-warning" : "bg-primary",
                )}
                style={{ width: `${Math.min(100, b.ratio * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
