import { expect, test } from "@playwright/test";
import { expectToast, signIn } from "./helpers";

test("changing the withdrawal fee changes what the next withdrawal costs", async ({
  page,
}) => {
  await signIn(page, "Adaeze Okafor", "/fees");

  await page.getByRole("button", { name: "Edit Withdrawal fee" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Percent (%)").fill("1");
  await dialog.getByLabel("Cap (₦)").fill("2,000");
  // The preview compares the old and new rule before anything is saved
  await expect(dialog.getByText(/would earn/)).toBeVisible();
  await dialog.getByRole("button", { name: "Save rule" }).click();
  await expectToast(page, "Withdrawal fee is now 1% + ₦25, max ₦2,000");

  await page.goto("/wallets");
  await page
    .getByRole("row", { name: /Kola Kitchen/ })
    .getByRole("button", { name: "Withdraw" })
    .click();
  const withdraw = page.getByRole("dialog");
  await withdraw.getByLabel("Amount (₦)").fill("10,000");
  // 1% of ₦10,000 + ₦25
  await expect(withdraw.getByText("Fee (1% + ₦25, max ₦2,000)")).toBeVisible();
  await expect(withdraw.getByText("+₦125.00")).toBeVisible();

  await page.goto("/audit-log?category=fees");
  await expect(
    page.getByRole("row", {
      name: /Changed a default fee.*Withdrawal.*0\.5% \+ ₦25, max ₦1,000 → 1% \+ ₦25, max ₦2,000/,
    }),
  ).toBeVisible();
});

test("an invalid rule is explained in the form and never saved", async ({
  page,
}) => {
  await signIn(page, "Adaeze Okafor", "/fees");
  await page.getByRole("button", { name: "Edit Withdrawal fee" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cap (₦)").fill("10");
  await expect(
    dialog.getByText("The cap can't be lower than the flat fee"),
  ).toBeVisible();
});

test("operations can read fee rules but not change them", async ({ page }) => {
  await signIn(page, "Tunde Bakare", "/fees");
  await expect(page.getByRole("heading", { name: "Default rules" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0);
});
