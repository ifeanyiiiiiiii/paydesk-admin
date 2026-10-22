import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/data/types";
import { kobo } from "@/lib/money";
import {
  parseTransactionQuery,
  queryTransactions,
  toSearchParams,
} from "./query";

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    id: "txn_00001",
    reference: "PDK-AAAA2222",
    businessId: "biz_001",
    businessName: "Kola Kitchen",
    customerName: "Chinedu Okonkwo",
    type: "collection",
    channel: "card",
    status: "successful",
    amount: kobo(100_000),
    fee: kobo(1_500),
    createdAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

const data: Transaction[] = [
  txn({
    id: "txn_00001",
    reference: "PDK-AAAA2222",
    status: "successful",
    createdAt: "2026-10-03T09:00:00.000Z",
  }),
  txn({
    id: "txn_00002",
    reference: "PDK-BBBB3333",
    status: "failed",
    type: "payout",
    customerName: "Aisha Bello",
    createdAt: "2026-10-02T23:30:00.000Z",
  }),
  txn({
    id: "txn_00003",
    reference: "PDK-CCCC4444",
    status: "pending",
    businessName: "Gidi Fitness",
    createdAt: "2026-10-01T00:00:00.000Z",
  }),
];

const query = (params: Record<string, string>) =>
  queryTransactions(data, parseTransactionQuery(params));

describe("parseTransactionQuery", () => {
  it("uses defaults for an empty URL", () => {
    expect(parseTransactionQuery({})).toEqual({ q: "", page: 1, pageSize: 25 });
  });

  it("parses valid params", () => {
    expect(
      parseTransactionQuery({
        q: "  kola ",
        status: "failed",
        type: "payout",
        from: "2026-10-01",
        to: "2026-10-05",
        page: "3",
        pageSize: "50",
      }),
    ).toEqual({
      q: "kola",
      status: "failed",
      type: "payout",
      from: "2026-10-01",
      to: "2026-10-05",
      page: 3,
      pageSize: 50,
    });
  });

  it("falls back to defaults instead of erroring on bad input", () => {
    expect(
      parseTransactionQuery({
        status: "stolen",
        type: "x",
        from: "yesterday",
        page: "-4",
        pageSize: "9999",
      }),
    ).toEqual({ q: "", page: 1, pageSize: 25 });
  });

  it("takes the first value of repeated params", () => {
    expect(
      parseTransactionQuery({ status: ["failed", "pending"] }).status,
    ).toBe("failed");
  });
});

describe("queryTransactions", () => {
  it("filters by status and type", () => {
    expect(query({ status: "failed" }).rows.map((t) => t.id)).toEqual([
      "txn_00002",
    ]);
    expect(query({ type: "payout" }).total).toBe(1);
  });

  it("searches reference, customer and business, ignoring case", () => {
    expect(query({ q: "pdk-cccc" }).rows[0].id).toBe("txn_00003");
    expect(query({ q: "aisha" }).rows[0].id).toBe("txn_00002");
    expect(query({ q: "GIDI" }).rows[0].id).toBe("txn_00003");
    expect(query({ q: "nobody" }).total).toBe(0);
  });

  it("filters by whole days in Lagos time, matching how dates are displayed", () => {
    // txn_00002 is 2 Oct 23:30 UTC, which is 3 Oct 00:30 in Lagos
    expect(
      query({ from: "2026-10-01", to: "2026-10-02" }).rows.map((t) => t.id),
    ).toEqual(["txn_00003"]);
    expect(
      query({ from: "2026-10-03", to: "2026-10-03" }).rows.map((t) => t.id),
    ).toEqual(["txn_00001", "txn_00002"]);
  });

  it("includes the start of the 'from' day in Lagos", () => {
    // 1 Oct 00:00 UTC is 1 Oct 01:00 in Lagos
    expect(query({ from: "2026-10-01", to: "2026-10-01" }).total).toBe(1);
  });

  it("paginates", () => {
    const page = query({ pageSize: "10" });
    expect(page).toMatchObject({ total: 3, page: 1, pageCount: 1 });
  });

  it("clamps a page past the end to the last page", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      txn({ id: `txn_${String(i).padStart(5, "0")}` }),
    );
    const page = queryTransactions(
      many,
      parseTransactionQuery({ page: "9", pageSize: "10" }),
    );
    expect(page).toMatchObject({ page: 3, pageCount: 3, total: 30 });
    expect(page.rows).toHaveLength(10);
  });

  it("returns one empty page when nothing matches", () => {
    expect(query({ q: "zzz" })).toMatchObject({
      rows: [],
      total: 0,
      page: 1,
      pageCount: 1,
    });
  });
});

describe("toSearchParams", () => {
  it("leaves out defaults", () => {
    expect(toSearchParams(parseTransactionQuery({})).toString()).toBe("");
  });

  it("round-trips through parseTransactionQuery", () => {
    const params = {
      q: "kola",
      status: "failed",
      from: "2026-10-01",
      page: "2",
      pageSize: "50",
    };
    const parsed = parseTransactionQuery(params);
    expect(
      parseTransactionQuery(Object.fromEntries(toSearchParams(parsed))),
    ).toEqual(parsed);
  });
});
