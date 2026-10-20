import { describe, expect, it } from "vitest";
import { DATA_END, generateBusinesses, generateTransactions } from "./seed";

const businesses = generateBusinesses();
const transactions = generateTransactions(businesses);

describe("generateTransactions", () => {
  it("is deterministic", () => {
    expect(generateTransactions(businesses)).toEqual(transactions);
  });

  it("generates 5,000 transactions with unique ids and references", () => {
    expect(transactions).toHaveLength(5_000);
    expect(new Set(transactions.map((t) => t.id)).size).toBe(5_000);
    expect(new Set(transactions.map((t) => t.reference)).size).toBe(5_000);
  });

  it("keeps every amount and fee as whole, non-negative kobo", () => {
    for (const txn of transactions) {
      expect(Number.isSafeInteger(txn.amount)).toBe(true);
      expect(Number.isSafeInteger(txn.fee)).toBe(true);
      expect(txn.amount).toBeGreaterThan(0);
      expect(txn.fee).toBeGreaterThanOrEqual(0);
    }
  });

  it("doesn't charge fees on failed transactions", () => {
    const failed = transactions.filter((t) => t.status === "failed");
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((t) => t.fee === 0)).toBe(true);
  });

  it("only uses bank transfer for payouts and refunds", () => {
    const outgoing = transactions.filter((t) => t.type !== "collection");
    expect(outgoing.every((t) => t.channel === "bank_transfer")).toBe(true);
  });

  it("sorts newest first, within the 180 days before DATA_END", () => {
    const times = transactions.map((t) => Date.parse(t.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(Math.max(...times)).toBeLessThanOrEqual(DATA_END);
    expect(Math.min(...times)).toBeGreaterThan(DATA_END - 180 * 86_400_000);
  });

  it("links every transaction to a real business", () => {
    const names = new Map(businesses.map((b) => [b.id, b.name]));
    for (const txn of transactions) {
      expect(names.get(txn.businessId)).toBe(txn.businessName);
    }
  });
});
