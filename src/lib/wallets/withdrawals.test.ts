import { describe, expect, it } from "vitest";
import { kobo } from "@/lib/money";
import { lookupAccount } from "./bank-lookup";
import {
  applyWalletDebits,
  checkWithdrawal,
  isAccountNumber,
  quoteWithdrawal,
  tryParseNaira,
  type Withdrawal,
  withdrawalFormSchema,
  withdrawalRequestSchema,
  withdrawalToTransaction,
} from "./withdrawals";

const active = { balance: kobo(100_000_000), status: "active" as const }; // ₦1,000,000

describe("quoteWithdrawal", () => {
  it("charges 0.5% + ₦25", () => {
    // ₦10,000 → ₦50 + ₦25
    expect(quoteWithdrawal(kobo(1_000_000))).toEqual({
      amount: 1_000_000,
      fee: 7_500,
      total: 1_007_500,
    });
  });

  it("caps the fee at ₦1,000", () => {
    expect(quoteWithdrawal(kobo(500_000_000)).fee).toBe(100_000);
  });
});

describe("checkWithdrawal", () => {
  it("allows a normal withdrawal", () => {
    expect(checkWithdrawal(active, kobo(5_000_000))).toBeNull();
  });

  it("blocks frozen wallets before anything else", () => {
    expect(
      checkWithdrawal({ ...active, status: "frozen" }, kobo(5_000_000)),
    ).toBe("wallet_frozen");
  });

  it("enforces the minimum and maximum", () => {
    expect(checkWithdrawal(active, kobo(9_999))).toBe("below_minimum");
    expect(checkWithdrawal(active, kobo(10_000))).toBeNull();
    const rich = { ...active, balance: kobo(900_000_000) };
    expect(checkWithdrawal(rich, kobo(500_000_001))).toBe("above_maximum");
  });

  it("needs the balance to cover the amount plus the fee, not just the amount", () => {
    const balance = kobo(1_007_500); // exactly ₦10,000 + ₦75 fee
    expect(checkWithdrawal({ ...active, balance }, kobo(1_000_000))).toBeNull();
    expect(
      checkWithdrawal(
        { ...active, balance: kobo(balance - 1) },
        kobo(1_000_000),
      ),
    ).toBe("insufficient_funds");
  });
});

describe("tryParseNaira", () => {
  it("returns null instead of throwing", () => {
    expect(tryParseNaira("25,000")).toBe(2_500_000);
    expect(tryParseNaira("abc")).toBeNull();
  });
});

describe("withdrawalFormSchema", () => {
  const schema = withdrawalFormSchema(active);
  const valid = {
    amount: "25,000",
    bankCode: "101",
    accountNumber: "0123456789",
  };

  it("accepts valid input", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it.each([
    [{ amount: "abc" }, "Enter an amount, like 25,000"],
    [{ amount: "50" }, "The minimum withdrawal is ₦100.00"],
    [{ amount: "9,000,000" }, "The maximum withdrawal is ₦5,000,000.00"],
    [{ accountNumber: "12345" }, "Account numbers have exactly 10 digits"],
    [{ bankCode: "" }, "Choose a bank"],
  ])("rejects %j", (change, message) => {
    const result = schema.safeParse({ ...valid, ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });
});

describe("withdrawalRequestSchema", () => {
  const valid = {
    amount: 2_500_000,
    bankCode: "101",
    accountNumber: "0123456789",
    idempotencyKey: "3f2b8c1e-7a4d-4e9b-9c11-0a1b2c3d4e5f",
  };

  it("accepts a valid request", () => {
    expect(withdrawalRequestSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    [{ amount: 10.5 }],
    [{ amount: -5 }],
    [{ bankCode: "999" }],
    [{ idempotencyKey: "not-a-uuid" }],
  ])("rejects %j", (change) => {
    expect(
      withdrawalRequestSchema.safeParse({ ...valid, ...change }).success,
    ).toBe(false);
  });
});

describe("isAccountNumber", () => {
  it("needs exactly 10 digits", () => {
    expect(isAccountNumber("0123456789")).toBe(true);
    expect(isAccountNumber("012345678")).toBe(false);
    expect(isAccountNumber("01234567890")).toBe(false);
    expect(isAccountNumber("dddddddddd")).toBe(false);
  });
});

describe("lookupAccount", () => {
  it("gives the same name for the same account", () => {
    expect(lookupAccount("1234567890")).toBe(lookupAccount("1234567890"));
    expect(lookupAccount("1234567890")).toMatch(/^\w+ \w+$/);
  });

  it("finds nothing for numbers starting 000", () => {
    expect(lookupAccount("0001234567")).toBeNull();
  });
});

describe("withdrawalToTransaction", () => {
  const withdrawal: Withdrawal = {
    id: "3f2b8c1e-7a4d-4e9b-9c11-0a1b2c3d4e5f",
    walletId: "wal_001",
    amount: kobo(2_500_000),
    fee: kobo(15_000),
    bankCode: "101",
    accountName: "Aisha Bello",
    accountLast4: "6789",
    by: "Tunde Bakare",
    at: "2026-10-30T10:00:00.000Z",
  };

  it("appears as a successful bank-transfer payout", () => {
    const txn = withdrawalToTransaction(withdrawal, {
      businessId: "biz_001",
      businessName: "Kola Kitchen",
    });
    expect(txn).toMatchObject({
      id: "txn_w3f2b8c1e",
      reference: "PDK-W3F2B8C1",
      businessName: "Kola Kitchen",
      type: "payout",
      channel: "bank_transfer",
      status: "successful",
      amount: 2_500_000,
      fee: 15_000,
    });
    expect(txn.customerName).toContain("Aisha Bello");
    expect(txn.customerName).toContain("••6789");
  });
});

describe("applyWalletDebits", () => {
  it("takes withdrawn totals off the right wallet only", () => {
    const wallets = [
      { id: "wal_001", balance: kobo(1_000) },
      { id: "wal_002", balance: kobo(2_000) },
    ];
    expect(applyWalletDebits(wallets, { wal_002: 500 })).toEqual([
      wallets[0],
      { id: "wal_002", balance: 1_500 },
    ]);
  });
});
