import { describe, expect, it } from "vitest";
import { findNavItem, navigationFor } from "./navigation";

const titles = (role: Parameters<typeof navigationFor>[0]) =>
  navigationFor(role).flatMap((group) => group.items.map((item) => item.title));

describe("navigationFor", () => {
  it("shows super admins everything", () => {
    expect(titles("super_admin")).toEqual([
      "Overview",
      "Transactions",
      "Businesses",
      "Wallets",
      "Fees",
      "Admin users",
      "Audit log",
    ]);
  });

  it("hides admin users from operations", () => {
    expect(titles("operations")).not.toContain("Admin users");
    expect(titles("operations")).toContain("Fees");
  });

  it("drops the Settings group entirely for viewers", () => {
    expect(navigationFor("viewer").map((group) => group.label)).toEqual([
      "Operations",
    ]);
  });
});

describe("findNavItem", () => {
  it("matches nested paths", () => {
    expect(findNavItem("/transactions/txn_123")?.title).toBe("Transactions");
  });

  it("doesn't match paths that only share a prefix", () => {
    expect(findNavItem("/feesxyz")).toBeUndefined();
  });
});
