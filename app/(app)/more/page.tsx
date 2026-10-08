import { ChevronRight, Download, Repeat, Settings, Shapes, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Money } from "@/components/money";
import { requireUser } from "@/lib/dal";
import { getAccounts, netWorth } from "@/lib/queries/accounts";

export const metadata: Metadata = { title: "More" };

export default async function MorePage() {
  const user = await requireUser();
  const accounts = await getAccounts();
  const total = netWorth(accounts)[user.defaultCurrency] ?? 0;

  const links = [
    {
      href: "/accounts",
      label: "Accounts",
      description: `${accounts.length} active`,
      icon: Wallet,
      color: "#3B82F6",
    },
    {
      href: "/categories",
      label: "Categories",
      description: "Edit categories & budgets",
      icon: Shapes,
      color: "#F97316",
    },
    {
      href: "/recurring",
      label: "Recurring",
      description: "Rent, salary, subscriptions",
      icon: Repeat,
      color: "#8B5CF6",
    },
    {
      href: "/settings",
      label: "Settings",
      description: "Profile, currency, theme, export",
      icon: Settings,
      color: "#64748B",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader title="More" />
      <Link
        href="/accounts"
        className="pressable bg-card flex items-center gap-4 rounded-3xl border p-4"
      >
        <span className="bg-primary/15 text-primary flex size-12 items-center justify-center rounded-full text-lg font-bold">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{user.name}</span>
          <span className="text-muted-foreground block truncate text-sm">{user.email}</span>
        </span>
        <span className="text-right">
          <span className="text-muted-foreground block text-xs">Net worth</span>
          <Money value={total} currency={user.defaultCurrency} className="font-bold" />
        </span>
      </Link>
      <ul className="bg-card overflow-hidden rounded-3xl border">
        {links.map((l) => (
          <li key={l.href} className="border-b last:border-b-0">
            <Link
              href={l.href}
              className="pressable hover:bg-surface-2/60 flex min-h-16 items-center gap-3 px-4 py-3"
            >
              <span
                className="flex size-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${l.color}26`, color: l.color }}
              >
                <l.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{l.label}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {l.description}
                </span>
              </span>
              <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/settings"
        className="text-muted-foreground flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Download className="size-4" aria-hidden="true" /> Install the app from Settings
      </Link>
    </div>
  );
}
