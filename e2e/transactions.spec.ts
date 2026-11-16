import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("filters live in the URL, so a filtered view survives a reload", async ({
  page,
}) => {
  await signIn(page, "Ngozi Eze", "/transactions?status=failed");
  const rows = page.getByRole("table").first().getByRole("row");
  await expect(rows.nth(1)).toContainText("Failed");

  await page.reload();
  await expect(page).toHaveURL(/status=failed/);
  await expect(rows.nth(1)).toContainText("Failed");
});

test("an export downloads exactly the filtered rows and is audited", async ({
  page,
}) => {
  await signIn(page, "Tunde Bakare", "/transactions?status=failed");

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^paydesk-transactions-.*\.csv$/);

  const lines = (await readFile(await download.path(), "utf8"))
    .trim()
    .split(/\r?\n/);
  expect(lines[0]).toContain("Reference");
  const rows = lines.slice(1);
  expect(rows.length).toBeGreaterThan(100);
  expect(rows.every((row) => row.includes(",Failed,"))).toBe(true);

  await page.goto("/audit-log?category=exports");
  await expect(
    page.getByRole("row", {
      name: new RegExp(`Exported transactions.*${rows.length} rows, status: failed`),
    }),
  ).toBeVisible();
});

test("viewers can't export", async ({ page }) => {
  await signIn(page, "Ngozi Eze", "/transactions");
  await expect(page.getByRole("button", { name: "Export CSV" })).toHaveCount(0);
  expect((await page.request.get("/transactions/export")).status()).toBe(403);
});
