import { describe, expect, it } from "vitest";
import { can, type Permission, roles } from "./permissions";

describe("can", () => {
  it("lets every role view the core operations pages", () => {
    const core: Permission[] = [
      "overview:view",
      "transactions:view",
      "businesses:view",
      "wallets:view",
    ];
    for (const role of roles) {
      for (const permission of core) {
        expect(can(role, permission)).toBe(true);
      }
    }
  });

  it("keeps viewers read-only", () => {
    expect(can("viewer", "wallets:freeze")).toBe(false);
    expect(can("viewer", "wallets:withdraw")).toBe(false);
    expect(can("viewer", "transactions:export")).toBe(false);
    expect(can("viewer", "fees:view")).toBe(false);
    expect(can("viewer", "audit:view")).toBe(false);
  });

  it("lets operations act on wallets but not manage fees or admins", () => {
    expect(can("operations", "wallets:freeze")).toBe(true);
    expect(can("operations", "wallets:withdraw")).toBe(true);
    expect(can("operations", "fees:view")).toBe(true);
    expect(can("operations", "fees:manage")).toBe(false);
    expect(can("operations", "admins:view")).toBe(false);
  });

  it("gives super admins every permission", () => {
    const all: Permission[] = [
      "transactions:export",
      "wallets:withdraw",
      "fees:manage",
      "admins:manage",
      "audit:view",
    ];
    for (const permission of all) {
      expect(can("super_admin", permission)).toBe(true);
    }
  });
});
