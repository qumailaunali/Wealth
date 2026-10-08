import {
  ArrowLeftRight,
  ChartPie,
  House,
  LayoutGrid,
  Repeat,
  Settings,
  Shapes,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Mobile bottom tab bar (the centre "+" is rendered separately). */
export const TAB_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/transactions", label: "Activity", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: ChartPie },
  { href: "/more", label: "More", icon: LayoutGrid },
];

/** Desktop sidebar. */
export const SIDEBAR_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/categories", label: "Categories", icon: Shapes },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/reports", label: "Reports", icon: ChartPie },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/more") {
    return ["/more", "/accounts", "/categories", "/recurring", "/settings"].some((p) =>
      pathname.startsWith(p),
    );
  }
  return pathname.startsWith(href);
}
