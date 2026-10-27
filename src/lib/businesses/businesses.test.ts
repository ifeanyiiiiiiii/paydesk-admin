import { describe, expect, it } from "vitest";
import type { Business, Transaction, Wallet } from "@/lib/data/types";
import { kobo } from "@/lib/money";
import { summariseBusinesses } from "./businesses";

const business = (id: string, name: string): Business => ({
  id,
  name,
  category: "Food & drink",
  city: "Lagos",
  verification: "verified",
  joinedAt: "2025-01-01T00:00:00.000Z",
});

const wallet = (
  businessId: string,
  status: Wallet["status"] = "active",
): Wallet => ({
  id: `wal_${businessId}`,
  businessId,
  businessName: "",
  balance: kobo(1_000_000),
  status,
});

const txn = (
  businessId: string,
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id: "txn_00001",
  reference: "PDK-1",
  businessId,
  businessName: "",
  customerName: "",
  type: "collection",
  channel: "card",
  status: "successful",
  amount: kobo(10_000),
  fee: kobo(100),
  createdAt: "2026-10-20T12:00:00.000Z",
  ...overrides,
});

describe("summariseBusinesses", () => {
  const businesses = [business("a", "Alpha"), business("b", "Beta")];
  const wallets = [wallet("a"), wallet("b", "frozen")];

  it("sums successful volume in the 30 Lagos days ending on `to`", () => {
    const rows = summariseBusinesses(
      businesses,
      [
        txn("a", { amount: kobo(50_000) }),
        txn("a", {
          amount: kobo(20_000),
          createdAt: "2026-09-21T12:00:00.000Z",
        }), // day 1 of 30
        txn("a", {
          amount: kobo(99_000),
          createdAt: "2026-09-20T12:00:00.000Z",
        }), // too old
        txn("a", { status: "failed", amount: kobo(77_000) }),
        txn("b", { amount: kobo(10_000) }),
      ],
      wallets,
      "2026-10-20",
    );
    expect(rows[0]).toMatchObject({
      id: "a",
      volume30d: 70_000,
      transactions30d: 2,
    });
    expect(rows[1]).toMatchObject({
      id: "b",
      volume30d: 10_000,
      transactions30d: 1,
    });
  });

  it("includes each business's wallet, including a visitor's freeze", () => {
    const rows = summariseBusinesses(businesses, [], wallets, "2026-10-20");
    expect(rows.find((r) => r.id === "b")).toMatchObject({
      walletId: "wal_b",
      walletStatus: "frozen",
      balance: 1_000_000,
    });
  });

  it("shows businesses with no activity as zero", () => {
    const rows = summariseBusinesses(businesses, [], wallets, "2026-10-20");
    expect(
      rows.every((r) => r.volume30d === 0 && r.transactions30d === 0),
    ).toBe(true);
  });
});
