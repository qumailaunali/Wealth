import { BottomNav, Sidebar } from "@/components/layout/app-nav";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { AppDataProvider } from "@/components/providers/app-data";
import { AppProviders } from "@/components/providers/app-providers";
import { AddTransactionProvider } from "@/components/transactions/add-transaction-provider";
import { requireUser } from "@/lib/dal";
import { getAccounts } from "@/lib/queries/accounts";
import { getCategories, getTags } from "@/lib/queries/categories";
import { processDueRecurring } from "@/lib/queries/recurring";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Generate any recurring transactions that became due since the last visit (no cron needed).
  await processDueRecurring(user.id, user.timezone);
  const [accounts, categories, tags] = await Promise.all([
    getAccounts({ includeArchived: true }),
    getCategories({ includeArchived: true }),
    getTags(),
  ]);

  return (
    <AppProviders>
      <AppDataProvider
        value={{
          prefs: {
            name: user.name,
            email: user.email,
            defaultCurrency: user.defaultCurrency,
            locale: user.locale,
            weekStart: user.weekStart,
            timezone: user.timezone,
            theme: user.theme,
          },
          accounts,
          categories,
          tags,
        }}
      >
        <AddTransactionProvider>
          <div className="flex min-h-dvh">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <OfflineBanner />
              <main
                id="main"
                className="mx-auto w-full max-w-2xl flex-1 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:px-6 lg:max-w-5xl lg:px-10 lg:pt-8 lg:pb-12"
              >
                {children}
              </main>
            </div>
          </div>
          <BottomNav />
        </AddTransactionProvider>
      </AppDataProvider>
    </AppProviders>
  );
}
