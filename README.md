# Wealth — personal expense tracker (PWA)

A fast, private, mobile-first finance app: track income and expenses across cash, bank, wallet, card and
savings accounts, see your net worth, set budgets, automate recurring payments, and install it on your
phone like a native app.

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS 4 + shadcn/ui (Radix) · PostgreSQL + Prisma 7 ·
Auth.js v5 (credentials, JWT) · Zod + react-hook-form · TanStack Query · Recharts · Motion · Serwist · date-fns · pnpm

## Quick start

```bash
pnpm install                 # also runs `prisma generate`
cp .env.example .env         # then fill in DATABASE_URL, DIRECT_URL and AUTH_SECRET
pnpm db:migrate              # create the schema
pnpm db:seed                 # optional demo data
pnpm dev                     # http://localhost:3000
```

Demo login (after seeding): **demo@wealth.app / demo12345**

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection used at runtime (a pooled URL such as Neon `-pooler` is fine) |
| `DIRECT_URL` | recommended | Direct, non-pooled URL used by `prisma migrate`. Falls back to `DATABASE_URL` |
| `AUTH_SECRET` | ✅ | Random secret for signing sessions: `openssl rand -base64 32` |
| `AUTH_URL` | ✅ in prod | Public URL of the app, e.g. `https://wealth.example.com` |
| `AUTH_TRUST_HOST` | behind proxies | `true` when running behind a reverse proxy / on a VPS |
| `CRON_SECRET` | optional | Enables `GET /api/cron/recurring` (see Recurring transactions) |

### Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack; service worker disabled) |
| `pnpm build` / `pnpm start` | Production build (webpack, needed by Serwist) / serve it |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | ESLint · `tsc --noEmit` · Prettier |
| `pnpm test` | Vitest unit tests (money, balances, recurrence, keypad, periods) |
| `pnpm test:e2e` | Playwright E2E (register → account → transaction → balance; mobile 360/390/430px sweep) |
| `pnpm db:migrate` · `pnpm db:deploy` · `pnpm db:studio` · `pnpm db:seed` | Prisma migrate (dev / prod) · Studio · demo data |
| `pnpm icons` | Regenerate every favicon / PWA icon from `assets/brand/*.png` |

PWA checks need a production server: `pnpm build && pnpm start`, then
`E2E_BASE_URL=http://localhost:3000 pnpm test:e2e tests/e2e/pwa.spec.ts`.

## Features

- **Auth:** email + password (bcrypt, 12 rounds), persistent JWT sessions (30 days), route protection in `proxy.ts`
  plus a re-check in every page, server action and API route. Changing your password signs out every device
  (token versioning). Login and sign-up are rate limited.
- **Accounts:** cash, bank, mobile wallet, credit card, savings and other. Per-account currency, colour, icon, note,
  "include in total" and archive. Balances are **derived from the ledger** (opening + income − expenses ± transfers)
  with SQL aggregates, never stored, so they can't drift. Credit cards show "Owed".
- **Categories:** expense and income categories, one level of sub-categories, icon and colour pickers, monthly
  budgets (warning at 80%, alert at 100%). Defaults are created on sign-up. Deleting a category in use requires
  moving its transactions or archiving it.
- **Transactions:** expense, income and transfer. The **+** button opens a bottom sheet with a big keypad, category
  chips, account chips and date, so an expense takes ~5 seconds to log. Supports notes, tags and a receipt link.
  Edit, or delete with **Undo**. The list is grouped by day with daily totals, with infinite scroll, search and
  filters (type, account, category, date range, amount range). CSV export uses the same filters.
- **Transfers between currencies:** you enter both amounts (no FX conversion in v1); totals are shown per currency.
- **Recurring:** daily, weekly, monthly or yearly with an interval and end date. Due transactions are created when
  the app opens, with no cron needed. Monthly rules on the 31st stay anchored and don't drift to the 28th.
- **Dashboard:** greeting, total-balance card (tap to hide, count-up), account carousel, this month vs last month,
  spending donut, 7/30-day trend, budgets, recent transactions.
- **Reports:** this week, this month, last month, 3 months, year or custom. Includes income vs expense, category
  breakdown, top categories, top payees, average daily spend, savings rate and CSV export.
- **Settings:** profile, default currency, number format (incl. lakh/crore), first day of week, timezone, dark or
  light theme, change password, CSV/JSON export, delete account, install app.

## PWA

- `app/manifest.ts`: standalone, portrait, theme `#0B0D12`, any + maskable icons, and shortcuts for
  **Add expense / Add income / Transfer** (`/transactions/new?type=…`).
- Serwist service worker (`app/sw.ts`): precaches the app shell and static assets; images and fonts are cached at
  runtime; API data is network-first; auth and exports are never cached. A branded `/offline` fallback is shown for
  pages you haven't opened before. The worker is **disabled in development**.
- **Update flow:** when a new version is deployed, an "Update available · Reload" toast appears.
- **Offline:** a "You're offline" banner appears and cached pages keep working. **Transactions added offline are
  queued in IndexedDB** and synced automatically when you reconnect. Each one carries a client UUID used as an
  idempotency key, so nothing is lost or duplicated.
- **Install:** on Android/Chrome use Settings → Install app (uses `beforeinstallprompt`) or the browser menu →
  Install app. On iPhone/iPad, open it in **Safari → Share → Add to Home Screen**.
- ⚠️ **Installing requires HTTPS** in production (`localhost` is exempt for testing).

### Icons

The source artwork lives in `assets/brand/app-icon.png` (2048px) and `assets/brand/favicon.png` (512px).
`pnpm icons` (sharp) regenerates `app/favicon.ico` (16/32/48), `app/icon.png`, `app/apple-icon.png` (180, opaque),
`public/icons/icon-{96,192,512}.png`, `public/icons/maskable-{192,512}.png` (80% safe zone, full-bleed background),
`public/brand/logo.png` and `app/opengraph-image.png`.

## Architecture

```
app/(auth)/…            login, register
app/(app)/…             protected shell (bottom tabs on mobile, sidebar on desktop): dashboard, transactions,
                        accounts, categories, recurring, reports, settings, more
app/api/…               transactions (paged JSON), export/csv, export/json, cron/recurring, auth
lib/dal.ts              central data-access guard: current user + ownership checks (IDOR protection)
lib/queries/*           user-scoped reads          lib/actions/*  user-scoped server actions (Zod-validated)
lib/validators/*        Zod schemas shared by forms and the server
lib/money.ts            the only place money is parsed/formatted (integer minor units, never floats)
lib/balance.ts · lib/recurrence.ts · lib/dates.ts   pure, unit-tested domain logic (timezone-aware)
prisma/schema.prisma    data model · prisma/seed.ts demo data
```

**Decisions**

- Money is stored as `BIGINT` minor units (paisa/cents) and converted to JS numbers (safe up to 9×10¹⁵) only at
  the data layer.
- Timestamps are stored in UTC. Day, week and month boundaries are computed in the user's timezone (default
  `Asia/Karachi`).
- Every query filters by `userId` obtained from the session in `lib/dal.ts`. Referenced ids (accounts,
  categories) are always ownership-checked before writing.
- Security: Zod on every input, Prisma only (no raw SQL), no `dangerouslySetInnerHTML`, CSP and security headers in
  `next.config.ts`, Auth.js httpOnly/SameSite cookies (secure in production), CSV formula-injection escaping.
- Charts are lazy-loaded (`next/dynamic`, client only). The income/expense colour pair was validated for
  colour-blind separation on both themes.
- Product name: the brief used both "Hisaab" and "Wealth"; the final brief and the brand assets use **Wealth**.

## Deploying

**Vercel:** import the repo, add the env vars (`AUTH_URL` = your domain), set the build command to `pnpm build`,
and run `pnpm db:deploy` once (or add it to the build command). Use a managed Postgres such as Neon, Supabase or
RDS. Optional: add a Vercel Cron hitting `/api/cron/recurring` with header `Authorization: Bearer $CRON_SECRET`.

**VPS (Node 20+):**

```bash
pnpm install --frozen-lockfile && pnpm db:deploy && pnpm build
PORT=3000 pnpm start        # run under pm2/systemd, behind Nginx/Caddy with HTTPS
```

Set `AUTH_TRUST_HOST=true` behind a reverse proxy. Optional cron:
`*/30 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/recurring`.

## Known limitations

- The rate limiter is in-memory: per process, reset on restart. Use Redis/Upstash when running several instances.
- No currency conversion: totals are shown per currency, and cross-currency transfers need both amounts.
- Receipts are a URL field only (no upload yet).
- Offline mode can add transactions but not edit or delete them. Pages you never opened show the offline page.
- Budgets and reports use the default currency (other currencies are available in the Reports currency picker).

## Next steps

Receipt uploads (S3/R2 + image compression) · multi-currency conversion with daily FX rates · bank/CSV import ·
biometric lock (WebAuthn) · offline edit/delete · push reminders for bills · shared household budgets.
