import { LogoMark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-safe pb-safe relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5">
      <div
        aria-hidden="true"
        className="bg-primary/20 pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[420px] max-w-xl rounded-full blur-[120px]"
      />
      <div className="relative w-full max-w-sm py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={64} className="mb-4 drop-shadow-[0_10px_30px_rgba(16,185,129,0.35)]" />
          <p className="text-muted-foreground text-sm font-semibold tracking-[0.2em] uppercase">
            Wealth
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
