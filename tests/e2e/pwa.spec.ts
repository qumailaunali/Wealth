import { expect, test } from "@playwright/test";

/**
 * PWA checks — the service worker only exists in production builds, so run against `pnpm build && pnpm start`:
 *   E2E_BASE_URL=http://localhost:3000 pnpm test:e2e tests/e2e/pwa.spec.ts
 */
test.skip(!process.env.E2E_BASE_URL, "PWA checks need a production server (set E2E_BASE_URL)");

test("security headers are set", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("service worker registers, precaches the offline page and serves it offline", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@wealth.app");
  await page.getByLabel("Password", { exact: true }).fill("demo12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Service worker is installed and controlling the page
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/$/);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    for (const k of keys) {
      const cache = await caches.open(k);
      const reqs = await cache.keys();
      if (reqs.some((r) => new URL(r.url).pathname === "/offline")) return true;
    }
    return false;
  });
  expect(cached).toBe(true);

  // Visit a page so it's runtime-cached, then go offline
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await context.setOffline(true);

  // In-app: offline banner appears
  await page.goto("/");
  await expect(page.getByText(/You're offline/).first()).toBeVisible();

  // A page never visited falls back to the branded offline page
  await page.goto("/categories?never-visited=1");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();

  await context.setOffline(false);
});

test("transactions added offline are queued and synced when back online", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@wealth.app");
  await page.getByLabel("Password", { exact: true }).fill("demo12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  const title = `Offline chai ${Date.now()}`;
  await context.setOffline(true);
  await page.getByLabel("Add transaction", { exact: true }).click();
  const sheet = page.getByRole("dialog");
  for (const d of "150")
    await page.getByLabel("Amount keypad").getByRole("button", { name: d, exact: true }).click();
  await sheet.getByRole("radio", { name: /Food/ }).first().click();
  await sheet.getByPlaceholder(/Payee/).fill(title);
  await sheet.getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByText("Saved offline")).toBeVisible();
  await expect(page.getByText(/waiting to sync/)).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText(/Synced 1 offline transaction/)).toBeVisible({ timeout: 20_000 });
  await page.goto(`/transactions?q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title)).toBeVisible();
});
