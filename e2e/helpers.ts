import { expect, type Page } from "@playwright/test";

export type DemoAccount = "Adaeze Okafor" | "Tunde Bakare" | "Ngozi Eze";

/**
 * Signs in through the real login form. Each test gets a fresh browser
 * context, so every test starts signed out with an empty demo sandbox.
 */
export async function signIn(page: Page, account: DemoAccount, from = "") {
  await page.goto(from ? `/login?from=${encodeURIComponent(from)}` : "/login");
  await page.getByRole("button", { name: new RegExp(account) }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Signs out through the account menu, with its confirmation dialog. */
export async function signOut(page: Page) {
  await page.getByRole("button", { name: /^Account menu for/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Sign out" })
    .click();
  await page.waitForURL("**/login");
}

/** Picks an option from one of the app's select menus, found by its label. */
export async function choose(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible();
}
