import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./helpers";

test("a signed-out visitor is sent to log in, then back to where they were going", async ({
  page,
}) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login\?from=%2Ftransactions/);

  await page.getByRole("button", { name: /Ngozi Eze/ }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
});

test("each role sees only the pages it's allowed to", async ({ page }) => {
  const nav = page.getByRole("navigation").or(page.locator("[data-sidebar=content]"));

  await signIn(page, "Adaeze Okafor");
  await expect(nav.getByRole("link", { name: "Admin users" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Fees" })).toBeVisible();
  await signOut(page);

  await signIn(page, "Tunde Bakare");
  await expect(nav.getByRole("link", { name: "Fees" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Admin users" })).toHaveCount(0);
  await signOut(page);

  await signIn(page, "Ngozi Eze");
  await expect(nav.getByRole("link", { name: "Wallets" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Fees" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Audit log" })).toHaveCount(0);
});

test("typing the address of a forbidden page still doesn't open it", async ({
  page,
}) => {
  await signIn(page, "Ngozi Eze");
  await page.goto("/fees");
  await expect(
    page.getByText("You don't have access to this page"),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Default rules" })).toHaveCount(0);
});

test("signing out ends the session", async ({ page }) => {
  await signIn(page, "Tunde Bakare");
  await signOut(page);

  await page.goto("/overview");
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get("/api/wallets")).status()).toBe(401);
});

test("another website can't sign a visitor in", async ({ request }) => {
  const response = await request.post("/auth/sign-in", {
    form: { userId: "usr_adaeze" },
    headers: { Origin: "https://evil.example" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(403);
});
