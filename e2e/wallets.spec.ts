import { expect, test } from "@playwright/test";
import { choose, expectToast, signIn } from "./helpers";

test("a withdrawal shows its fee, sends once and is recorded everywhere", async ({
  page,
}) => {
  await signIn(page, "Tunde Bakare", "/wallets");

  await page
    .getByRole("row", { name: /Kola Kitchen/ })
    .getByRole("button", { name: "Withdraw" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount (₦)").fill("25,000");
  // The default rule: 0.5% + ₦25, so ₦125 + ₦25
  await expect(dialog.getByText("+₦150.00")).toBeVisible();

  await choose(page, "Bank", "Harmony Trust Bank");
  await dialog.getByLabel("Account number").fill("1234567890");
  // The demo's name lookup is deterministic
  await expect(dialog.getByText("Hauwa Ibekwe")).toBeVisible();

  await dialog.getByRole("button", { name: "Review" }).click();
  await expect(dialog.getByText("Review this withdrawal")).toBeVisible();
  await dialog.getByRole("button", { name: "Send ₦25,000.00" }).click();
  await expectToast(page, "₦25,000.00 sent to Hauwa Ibekwe");
  await expect(dialog).toBeHidden();

  // It appears as a payout in the transactions list
  await page.goto("/transactions?type=payout");
  await expect(
    page.getByRole("row", { name: /Hauwa Ibekwe/ }).first(),
  ).toBeVisible();

  // And in the audit log, with the fee
  await page.goto("/audit-log?category=withdrawals");
  await expect(
    page.getByRole("row", { name: /Kola Kitchen.*₦25,000\.00 \+ ₦150\.00 fee/ }),
  ).toBeVisible();
});

test("an amount outside the limits is stopped in the form", async ({
  page,
}) => {
  await signIn(page, "Tunde Bakare", "/wallets");
  await page
    .getByRole("row", { name: /Kola Kitchen/ })
    .getByRole("button", { name: "Withdraw" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount (₦)").fill("50");
  await dialog.getByRole("button", { name: "Review" }).click();
  await expect(
    dialog.getByText("The minimum withdrawal is ₦100.00"),
  ).toBeVisible();

  await dialog.getByLabel("Amount (₦)").fill("6,000,000");
  await expect(
    dialog.getByText("The maximum withdrawal is ₦5,000,000.00"),
  ).toBeVisible();
  await expect(dialog.getByText("Review this withdrawal")).toHaveCount(0);
});

test("a frozen wallet can't send money until it's unfrozen", async ({ page }) => {
  await signIn(page, "Tunde Bakare", "/wallets");
  const row = page.getByRole("row", { name: /Zuma Pharmacy/ });

  await row.getByRole("button", { name: "Freeze" }).click();
  await choose(page, "Reason", "Suspected fraud");
  await page.getByRole("dialog").getByRole("button", { name: "Freeze wallet" }).click();

  await expect(row.getByText("Frozen")).toBeVisible();
  // The server has confirmed it, not just the instant on-screen update
  await expectToast(page, "Zuma Pharmacy's wallet is frozen");
  await expect(row.getByRole("button", { name: "Withdraw" })).toBeDisabled();

  await row.getByRole("button", { name: "Unfreeze" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Unfreeze" }).click();
  await expect(row.getByText("Active")).toBeVisible();
  await expectToast(page, "Zuma Pharmacy's wallet is active again");
  await expect(row.getByRole("button", { name: "Withdraw" })).toBeEnabled();

  await page.goto("/audit-log?category=wallets");
  await expect(
    page.getByRole("row", { name: /Froze a wallet.*Zuma Pharmacy.*Suspected fraud/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Unfroze a wallet.*Zuma Pharmacy/ }),
  ).toBeVisible();
});

test("viewers see wallets but can't act on them", async ({ page }) => {
  await signIn(page, "Ngozi Eze", "/wallets");
  await expect(page.getByRole("row", { name: /Kola Kitchen/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Freeze" })).toHaveCount(0);
});
