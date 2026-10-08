import { expect, test } from "@playwright/test";

/**
 * Mobile viewport sweep (uses the seeded demo user — run `pnpm db:seed` first).
 * Verifies every screen renders without console errors or horizontal overflow at 360/390/430px.
 */
const PAGES = [
  "/",
  "/transactions",
  "/transactions/new?type=expense",
  "/accounts",
  "/categories",
  "/recurring",
  "/reports",
  "/reports?period=year",
  "/settings",
  "/more",
];
const WIDTHS = [360, 390, 430];

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@wealth.app");
  await page.getByLabel("Password", { exact: true }).fill("demo12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
});

for (const width of WIDTHS) {
  test(`all screens fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`${page.url()}: ${msg.text()}`);
    });
    page.on("pageerror", (err) => errors.push(`${page.url()}: ${err.message}`));

    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("main").first()).toBeVisible();
      // Compare against the intended device width: on mobile, overflowing content inflates innerWidth too.
      const overflow = await page.evaluate(
        (w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w,
        width,
      );
      expect(overflow, `horizontal overflow on ${path} at ${width}px`).toBeLessThanOrEqual(0);
      // Bottom navigation is present with the centre add button
      await expect(page.getByLabel("Add transaction", { exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test("dashboard shows balance, charts and budgets for the demo user", async ({ page }) => {
  await expect(page.getByRole("region", { name: "Total balance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spending by category" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Budgets" })).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
  // Privacy toggle hides the balance
  await page.getByRole("button", { name: "Hide balance", exact: true }).click();
  await expect(page.getByRole("region", { name: "Total balance" })).toContainText("••••");
  await page.getByRole("button", { name: "Show balance", exact: true }).click();
});

test("touch targets in the bottom nav are at least 44px", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Main" }).last();
  const boxes = await nav.locator("a, button").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    }),
  );
  expect(boxes.length).toBe(5);
  for (const b of boxes) {
    expect(b.h).toBeGreaterThanOrEqual(44);
    expect(b.w).toBeGreaterThanOrEqual(44);
  }
});

test("manifest is valid and installable", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.name).toBe("Wealth");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(
    manifest.icons.some(
      (i: { purpose: string; sizes: string }) => i.purpose === "maskable" && i.sizes === "512x512",
    ),
  ).toBe(true);
  expect(manifest.shortcuts).toHaveLength(3);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
});
