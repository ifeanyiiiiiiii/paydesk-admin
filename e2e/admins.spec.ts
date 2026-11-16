import { expect, test } from "@playwright/test";
import { choose, expectToast, signIn, signOut } from "./helpers";

test("a demoted admin loses access on their next visit", async ({ page }) => {
  await signIn(page, "Adaeze Okafor", "/admins");

  await page
    .getByRole("row", { name: /Tunde Bakare/ })
    .getByRole("button", { name: "Change role" })
    .click();
  const dialog = page.getByRole("dialog");
  await choose(page, "New role", "Viewer");
  // The dialog spells out what they lose before anything is saved
  await expect(dialog.getByText("They'll no longer be able to")).toBeVisible();
  await expect(dialog.getByText("Make withdrawals")).toBeVisible();
  await dialog.getByRole("button", { name: "Change role" }).click();
  await expectToast(page, "Tunde Bakare is now Viewer");
  await signOut(page);

  // The demo sandbox survives sign-out, so Tunde now signs in as a viewer
  await expect(page.getByRole("button", { name: /Tunde Bakare.*Viewer/ })).toBeVisible();
  await signIn(page, "Tunde Bakare", "/wallets");
  await expect(page.getByRole("row", { name: /Kola Kitchen/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
});

test("a deactivated admin can't sign in", async ({ page }) => {
  await signIn(page, "Adaeze Okafor", "/admins");

  await page
    .getByRole("row", { name: /Ngozi Eze/ })
    .getByRole("button", { name: "Deactivate" })
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Deactivate" }).click();
  await expectToast(page, "Ngozi Eze can no longer sign in");
  await signOut(page);

  await expect(page.getByRole("button", { name: /Ngozi Eze/ })).toBeDisabled();
});

test("admins can't change their own account", async ({ page }) => {
  await signIn(page, "Adaeze Okafor", "/admins");
  // Other rows mention her too ("Invited by Adaeze Okafor"), so match her own
  const own = page.getByRole("row", { name: /^AO Adaeze Okafor You/ });
  await expect(own.getByText("Your account")).toBeVisible();
  await expect(own.getByRole("button")).toHaveCount(0);

  // And the server refuses even if the page is bypassed
  const response = await page.request.patch("/api/admins/usr_adaeze", {
    data: { action: "deactivate" },
  });
  expect(response.status()).toBe(403);
});

test("invites need a company email address", async ({ page }) => {
  await signIn(page, "Adaeze Okafor", "/admins");
  await page.getByRole("button", { name: "Invite admin" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Seun Afolabi");
  await dialog.getByLabel("Work email").fill("seun@gmail.com");
  await choose(page, "Role", "Operations");
  await dialog.getByRole("button", { name: "Send invite" }).click();
  await expect(
    dialog.getByText("Use a company address ending in @paydesk.example"),
  ).toBeVisible();

  await dialog.getByLabel("Work email").fill("seun@paydesk.example");
  await dialog.getByRole("button", { name: "Send invite" }).click();
  await expectToast(page, "Invite sent to seun@paydesk.example");
  await expect(page.getByRole("row", { name: /Seun Afolabi.*Invited/ })).toBeVisible();
});
