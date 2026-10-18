import { FxRatesForm } from "./settings-forms";
import { requireUser } from "@/lib/dal";
import { getAccounts } from "@/lib/queries/accounts";

/** Exchange-rate settings, shown only when the user holds foreign-currency accounts. */
export async function FxRatesSection() {
  const user = await requireUser();
  const accounts = await getAccounts();
  const currencies = [
    ...new Set(
      accounts
        .filter((a) => !a.isArchived && a.currency !== user.defaultCurrency)
        .map((a) => a.currency),
    ),
  ].sort();
  if (!currencies.length) return null;
  return <FxRatesForm currencies={currencies} />;
}
