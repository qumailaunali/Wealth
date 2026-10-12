import { Settings } from "lucide-react";
import Link from "next/link";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { requireUser } from "@/lib/dal";
import { greeting } from "@/lib/dates";
import { getAccounts } from "@/lib/queries/accounts";
import { getDashboardData } from "@/lib/queries/insights";
import { getRecentTransactions } from "@/lib/queries/transactions";

export default async function DashboardPage() {
  const user = await requireUser();
  const [accounts, data, recent] = await Promise.all([
    getAccounts(),
    getDashboardData(),
    getRecentTransactions(7),
  ]);
  const firstName = user.name.split(" ")[0];
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-muted-foreground text-sm">{greeting(user.timezone)},</p>
          <h1 className="text-2xl font-bold tracking-tight">{firstName}</h1>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="pressable bg-surface-2 flex size-11 items-center justify-center rounded-full border text-sm font-bold lg:hidden"
        >
          {initials || <Settings className="size-5" aria-hidden="true" />}
        </Link>
      </header>

      <DashboardClient accounts={accounts} data={data} recent={recent} />
    </div>
  );
}
