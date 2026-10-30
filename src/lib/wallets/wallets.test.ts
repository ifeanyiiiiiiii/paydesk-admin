import { describe, expect, it } from "vitest";
import { generateBusinesses, generateTransactions } from "@/lib/data/seed";
import type { Wallet } from "@/lib/data/types";
import { kobo } from "@/lib/money";
import {
  applyWalletOverrides,
  changeWalletStatus,
  generateWallets,
  walletForRole,
  walletStatusChangeSchema,
  withWalletStatus,
} from "./wallets";

const businesses = generateBusinesses();
const wallets = generateWallets(businesses, generateTransactions(businesses));

const wallet: Wallet = {
  id: "wal_001",
  businessId: "biz_001",
  businessName: "Kola Kitchen",
  balance: kobo(5_000_000),
  status: "active",
};

describe("walletForRole", () => {
  const priced = {
    ...wallet,
    withdrawalFee: { percentBps: 25, flat: kobo(1_000) },
  };

  it("hides the fee rule from viewers, who can't see fee rules", () => {
    const seen = walletForRole(priced, "viewer");
    expect(seen).not.toHaveProperty("withdrawalFee");
    expect(seen.balance).toBe(priced.balance);
  });

  it("keeps it for roles that can withdraw", () => {
    expect(walletForRole(priced, "operations")).toEqual(priced);
    expect(walletForRole(priced, "super_admin")).toEqual(priced);
  });
});

describe("generateWallets", () => {
  it("creates one wallet per business with a positive whole-kobo balance", () => {
    expect(wallets).toHaveLength(businesses.length);
    for (const w of wallets) {
      expect(Number.isSafeInteger(w.balance)).toBe(true);
      expect(w.balance).toBeGreaterThan(0);
    }
  });

  it("is deterministic", () => {
    expect(
      generateWallets(businesses, generateTransactions(businesses)),
    ).toEqual(wallets);
  });

  it("starts two wallets frozen, with a reason", () => {
    const frozen = wallets.filter((w) => w.status === "frozen");
    expect(frozen.map((w) => w.businessName)).toEqual([
      "Sabo Auto Parts",
      "Owambe Rentals",
    ]);
    expect(frozen.every((w) => w.frozen?.reason)).toBe(true);
  });
});

describe("walletStatusChangeSchema", () => {
  it("requires a known reason to freeze", () => {
    expect(
      walletStatusChangeSchema.safeParse({ action: "freeze" }).success,
    ).toBe(false);
    expect(
      walletStatusChangeSchema.safeParse({
        action: "freeze",
        reason: "Because",
      }).success,
    ).toBe(false);
    expect(
      walletStatusChangeSchema.safeParse({
        action: "freeze",
        reason: "Suspected fraud",
      }).success,
    ).toBe(true);
  });

  it("rejects notes over 200 characters", () => {
    const result = walletStatusChangeSchema.safeParse({
      action: "freeze",
      reason: "Suspected fraud",
      note: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("changeWalletStatus", () => {
  const now = "2026-10-27T09:00:00.000Z";

  it("freezes an active wallet, recording who, when and why", () => {
    const result = changeWalletStatus(
      wallet,
      { action: "freeze", reason: "Suspected fraud", note: "Ticket #4412" },
      "Tunde Bakare",
      now,
    );
    expect(result).toEqual({
      ok: true,
      wallet: {
        ...wallet,
        status: "frozen",
        frozen: {
          reason: "Suspected fraud: Ticket #4412",
          at: now,
          by: "Tunde Bakare",
        },
      },
    });
  });

  it("refuses to freeze a frozen wallet or unfreeze an active one", () => {
    const frozen = { ...wallet, status: "frozen" as const };
    expect(
      changeWalletStatus(
        frozen,
        { action: "freeze", reason: "Suspected fraud" },
        "x",
        now,
      ),
    ).toEqual({ ok: false, error: "already_frozen" });
    expect(
      changeWalletStatus(wallet, { action: "unfreeze" }, "x", now),
    ).toEqual({
      ok: false,
      error: "not_frozen",
    });
  });

  it("clears the freeze details when unfreezing", () => {
    const frozen: Wallet = {
      ...wallet,
      status: "frozen",
      frozen: { reason: "r", at: now, by: "x" },
    };
    const result = changeWalletStatus(frozen, { action: "unfreeze" }, "x", now);
    expect(result).toEqual({ ok: true, wallet });
  });
});

describe("applyWalletOverrides", () => {
  it("applies a visitor's changes without touching other wallets", () => {
    const frozenDetails = { reason: "Suspected fraud", at: "t", by: "x" };
    const result = applyWalletOverrides(wallets, {
      wal_001: { status: "frozen", frozen: frozenDetails },
      wal_010: { status: "active" },
    });
    expect(result[0]).toMatchObject({
      status: "frozen",
      frozen: frozenDetails,
    });
    expect(result[9].status).toBe("active");
    expect(result[9].frozen).toBeUndefined();
    expect(result[1]).toBe(wallets[1]);
  });
});

describe("withWalletStatus", () => {
  it("flips one wallet for an optimistic update", () => {
    const result = withWalletStatus([wallet], "wal_001", "frozen");
    expect(result[0].status).toBe("frozen");
    expect(withWalletStatus(result, "wal_001", "active")[0]).toEqual(wallet);
  });
});
