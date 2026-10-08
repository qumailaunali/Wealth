import { expect, type Page, test } from "@playwright/test";

async function tapKeypad(page: Page, digits: string) {
  const keypad = page.getByLabel("Amount keypad");
  for (const d of digits)
    await keypad
      .getByRole("button", { name: d === "." ? "Decimal point" : d, exact: true })
      .click();
}

test("register → add account → add transaction → see balance", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // Register
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("supersecret1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "E2E" })).toBeVisible();

  // Logged-in users are redirected away from /login
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);

  // Add an account with an opening balance of 10,000
  await page.goto("/accounts?new=1");
  await page.getByLabel("Name", { exact: true }).fill("E2E Bank");
  await page.getByLabel("Current balance").fill("10000");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/accounts\/[a-z0-9]+$/);
  const balance = page.getByRole("region", { name: "Balance" });
  await expect(balance).toContainText("10,000");

  // Add an expense of 2,500.50 via the bottom-sheet keypad
  await page.getByLabel("Add transaction", { exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("radiogroup", { name: "Transaction type" })).toBeVisible();
  await tapKeypad(page, "2500.5");
  await expect(sheet.getByLabel("Amount", { exact: true })).toHaveText("2,500.5");
  await sheet.getByRole("radio", { name: /Food/ }).first().click();
  await sheet.getByRole("radio", { name: /E2E Bank/ }).click();
  await sheet.getByPlaceholder(/Payee/).fill("Grocery run");
  await sheet.getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByText("Transaction added")).toBeVisible();

  // Balance reflects the expense: 10,000 − 2,500.50 = 7,499.50
  await expect(balance).toContainText("7,499.50");

  // It shows up in the transactions list and search works
  await page.goto("/transactions");
  await expect(page.getByText("Grocery run")).toBeVisible();
  await page.getByLabel("Search transactions").fill("zzz-no-match");
  await expect(page.getByText("No matches")).toBeVisible();

  // Transfer to the default Cash account keeps net worth unchanged
  await page.goto("/accounts");
  const netWorthBefore =
    (await page.getByRole("region", { name: "Net worth" }).textContent()) ?? "";
  await page.getByLabel("Add transaction", { exact: true }).click();
  await page.getByRole("dialog").getByRole("radio", { name: "Transfer" }).click();
  await tapKeypad(page, "1000");
  await page.getByRole("dialog").getByRole("button", { name: "Save transfer" }).click();
  await expect(page.getByText("Transaction added")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Net worth" })).toHaveText(netWorthBefore);
});

test("unauthenticated users are redirected to login and APIs return 401", async ({
  page,
  request,
}) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login/);
  const res = await request.get("/api/transactions");
  expect(res.status()).toBe(401);
  const csv = await request.get("/api/export/csv");
  expect(csv.status()).toBe(401);
});
