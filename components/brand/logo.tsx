import Image from "next/image";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/logo.png"
      alt=""
      width={size}
      height={size}
      priority
      unoptimized
      className={cn("shrink-0 select-none", className)}
    />
  );
}

export function Wordmark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="text-xl font-extrabold tracking-tight">Wealth</span>
    </span>
  );
}
