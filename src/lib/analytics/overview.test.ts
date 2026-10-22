import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/data/types";
import { kobo } from "@/lib/money";
import { computeOverview, lagosDay, rangeSchema } from "./overview";

let next = 0;
function txn(overrides: Partial<Transaction>): Transaction {
  next += 1;
  return {
    id: `txn_${String(next).padStart(5, "0")}`,
    reference: `PDK-${next}`,
    businessId: "biz_001",
    businessName: "Kola Kitchen",
    customerName: "Chinedu Okonkwo",
    type: "collection",
    channel: "card",
    status: "successful",
    amount: kobo(10_000),
    fee: kobo(100),
    createdAt: "2026-10-20T12:00:00.000Z",
    ...overrides,
  };
}

describe("lagosDay", () => {
  it("rolls 23:30 UTC into the next Lagos day", () => {
    expect(lagosDay("2026-10-20T23:30:00.000Z")).toBe("2026-10-21");
    expect(lagosDay("2026-10-20T22:59:59.000Z")).toBe("2026-10-20");
  });
});

describe("rangeSchema", () => {
  it("accepts 7, 30 and 90 and falls back to 30", () => {
    expect(rangeSchema.parse("7")).toBe(7);
    expect(rangeSchema.parse("90")).toBe(90);
    expect(rangeSchema.parse("365")).toBe(30);
    expect(rangeSchema.parse(undefined)).toBe(30);
  });
});

describe("computeOverview", () => {
  const data = [
    // Current 7-day window: 14–20 Oct
    txn({ amount: kobo(50_000), fee: kobo(500) }),
    txn({
      amount: kobo(30_000),
      fee: kobo(300),
      createdAt: "2026-10-14T08:00:00.000Z",
    }),
    txn({ type: "payout", amount: kobo(20_000), fee: kobo(0) }),
    txn({ status: "failed", amount: kobo(99_000), fee: kobo(0) }),
    txn({ status: "pending", amount: kobo(5_000) }),
    txn({
      businessId: "biz_002",
      businessName: "Gidi Fitness",
      amount: kobo(90_000),
      fee: kobo(900),
    }),
    // Previous window: 7–13 Oct
    txn({
      amount: kobo(40_000),
      fee: kobo(400),
      createdAt: "2026-10-10T12:00:00.000Z",
    }),
    txn({ status: "failed", createdAt: "2026-10-10T12:00:00.000Z" }),
    // Outside both windows
    txn({ amount: kobo(1_000_000), createdAt: "2026-09-01T12:00:00.000Z" }),
  ];
  const overview = computeOverview(data, 7, "2026-10-20");

  it("covers the requested Lagos days", () => {
    expect(overview).toMatchObject({ from: "2026-10-14", to: "2026-10-20" });
    expect(overview.daily.map((d) => d.day)).toEqual([
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
    ]);
  });

  it("counts only successful money as volume and fees", () => {
    expect(overview.kpis.volume.current).toBe(
      50_000 + 30_000 + 20_000 + 90_000,
    );
    expect(overview.kpis.fees.current).toBe(500 + 300 + 900);
  });

  it("excludes pending from the success rate", () => {
    // 4 successful out of 5 completed (1 failed); the pending one doesn't count
    expect(overview.kpis.successRate.current).toBeCloseTo(4 / 5);
  });

  it("compares with the previous period", () => {
    expect(overview.kpis.volume.previous).toBe(40_000);
    expect(overview.kpis.volume.change).toBeCloseTo(
      (190_000 - 40_000) / 40_000,
    );
    expect(overview.kpis.transactions).toMatchObject({
      current: 6,
      previous: 2,
      change: 2,
    });
  });

  it("has no change figure when the previous period is empty", () => {
    const fresh = computeOverview([txn({})], 7, "2026-10-20");
    expect(fresh.kpis.volume.change).toBeNull();
  });

  it("splits daily volume into collections and payouts, with empty days as zero", () => {
    const day20 = overview.daily.find((d) => d.day === "2026-10-20")!;
    expect(day20).toMatchObject({ collections: 140_000, payouts: 20_000 });
    expect(overview.daily.find((d) => d.day === "2026-10-16")).toMatchObject({
      collections: 0,
      payouts: 0,
    });
  });

  it("counts every status, including zero", () => {
    expect(overview.statuses).toEqual([
      { status: "successful", count: 4 },
      { status: "pending", count: 1 },
      { status: "failed", count: 1 },
      { status: "reversed", count: 0 },
    ]);
  });

  it("ranks businesses by successful volume", () => {
    expect(overview.topBusinesses.map((b) => b.name)).toEqual([
      "Kola Kitchen",
      "Gidi Fitness",
    ]);
    expect(overview.topBusinesses[0]).toMatchObject({
      volume: 100_000,
      count: 3,
    });
  });
});
