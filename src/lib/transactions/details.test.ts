import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/data/types";
import { kobo } from "@/lib/money";
import { feeBreakdown, transactionTimeline } from "./details";

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    id: "txn_00007",
    reference: "PDK-AAAA2222",
    businessId: "biz_001",
    businessName: "Kola Kitchen",
    customerName: "Chinedu Okonkwo",
    type: "collection",
    channel: "card",
    status: "successful",
    amount: kobo(1_000_000),
    fee: kobo(25_000),
    createdAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("feeBreakdown", () => {
  it("deducts the fee from collections", () => {
    const { lines, total } = feeBreakdown(txn({}));
    expect(lines[1]).toMatchObject({ label: "PayDesk fee", sign: "-" });
    expect(total).toEqual({ label: "Business receives", amount: 975_000 });
  });

  it("adds the fee on top of payouts", () => {
    expect(feeBreakdown(txn({ type: "payout" })).total).toEqual({
      label: "Debited from wallet",
      amount: 1_025_000,
    });
  });

  it("settles nothing for failed transactions", () => {
    const { lines, total } = feeBreakdown(
      txn({ status: "failed", fee: kobo(0) }),
    );
    expect(lines).toHaveLength(1);
    expect(total.amount).toBe(0);
  });
});

describe("transactionTimeline", () => {
  const labels = (t: Transaction) => transactionTimeline(t).map((e) => e.label);

  it("follows each status", () => {
    expect(labels(txn({}))).toEqual(["Initiated", "Confirmed", "Settled"]);
    expect(labels(txn({ type: "payout" }))).toEqual(["Initiated", "Confirmed"]);
    expect(labels(txn({ status: "pending" }))).toEqual([
      "Initiated",
      "Awaiting confirmation",
    ]);
    expect(labels(txn({ status: "failed" }))).toEqual(["Initiated", "Failed"]);
    expect(labels(txn({ status: "reversed" }))).toEqual([
      "Initiated",
      "Confirmed",
      "Reversed",
    ]);
  });

  it("starts at the transaction's time and stays in order", () => {
    for (const status of [
      "successful",
      "pending",
      "failed",
      "reversed",
    ] as const) {
      const times = transactionTimeline(txn({ status })).map((e) =>
        Date.parse(e.at),
      );
      expect(times[0]).toBe(Date.parse("2026-10-01T12:00:00.000Z"));
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });

  it("gives failures a reason that fits the channel", () => {
    const failed = transactionTimeline(
      txn({ status: "failed", channel: "ussd" }),
    );
    expect(failed[1].description).toMatch(/USSD|phone/);
  });

  it("is the same every time", () => {
    expect(transactionTimeline(txn({}))).toEqual(transactionTimeline(txn({})));
  });
});
