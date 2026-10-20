import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it.each(["/transactions", "/transactions?status=failed&page=2", "/fees"])(
    "allows same-site path %s",
    (path) => {
      expect(safeRedirectPath(path)).toBe(path);
    },
  );

  it.each([
    null,
    undefined,
    "",
    "transactions",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
  ])("falls back for %s", (path) => {
    expect(safeRedirectPath(path)).toBe("/overview");
  });
});
