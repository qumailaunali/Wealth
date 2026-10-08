import {
  Baby,
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  ChartLine,
  CircleEllipsis,
  Clapperboard,
  Coffee,
  Coins,
  CreditCard,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Lightbulb,
  type LucideIcon,
  type LucideProps,
  Music,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Ticket,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

/** Curated icon set available in the category/account icon pickers. */
export const ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  banknote: Banknote,
  landmark: Landmark,
  smartphone: Smartphone,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
  coins: Coins,
  "hand-coins": HandCoins,
  "chart-line": ChartLine,
  "trending-up": TrendingUp,
  utensils: Utensils,
  coffee: Coffee,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  car: Car,
  bus: Bus,
  bike: Bike,
  fuel: Fuel,
  plane: Plane,
  house: House,
  lightbulb: Lightbulb,
  zap: Zap,
  wifi: Wifi,
  receipt: Receipt,
  "heart-pulse": HeartPulse,
  pill: Pill,
  dumbbell: Dumbbell,
  scissors: Scissors,
  clapperboard: Clapperboard,
  music: Music,
  "gamepad-2": Gamepad2,
  ticket: Ticket,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  laptop: Laptop,
  baby: Baby,
  "paw-print": PawPrint,
  wrench: Wrench,
  gift: Gift,
  briefcase: Briefcase,
  store: Store,
  sparkles: Sparkles,
  "circle-ellipsis": CircleEllipsis,
};

export const ICON_NAMES = Object.keys(ICONS);

export function AppIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? CircleEllipsis;
  return <Icon aria-hidden="true" {...props} />;
}

/** Round tinted badge with an icon — used for categories and accounts. */
export function IconBadge({
  name,
  color,
  size = "md",
  className = "",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims =
    size === "sm"
      ? "size-8 rounded-lg"
      : size === "lg"
        ? "size-12 rounded-2xl"
        : "size-10 rounded-xl";
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${dims} ${className}`}
      style={{ backgroundColor: `${color}26`, color }}
    >
      <AppIcon name={name} className={icon} />
    </span>
  );
}
