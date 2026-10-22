import { z } from "zod";
import {
  type Transaction,
  type TransactionStatus,
  transactionStatuses,
} from "@/lib/data/types";
import { type Kobo, kobo, sumKobo } from "@/lib/money";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

/** ?range= from the URL; anything else falls back to 30 days. */
export const rangeSchema = z.coerce
  .number()
  .refine((n): n is Range => (RANGES as readonly number[]).includes(n))
  .catch(30) as z.ZodType<Range>;

const DAY_MS = 24 * 60 * 60 * 1000;
const LAGOS_OFFSET_MS = 60 * 60 * 1000; // UTC+1, no daylight saving

/** The Lagos calendar day of a timestamp, as YYYY-MM-DD. */
export function lagosDay(iso: string): string {
  return new Date(Date.parse(iso) + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export interface Kpi {
  current: number;
  previous: number;
  /** Change vs the previous period as a fraction (0.12 = +12%), or null if there's nothing to compare. */
  change: number | null;
}

export interface DailyVolume {
  day: string;
  collections: Kobo;
  payouts: Kobo;
}

export interface BusinessVolume {
  id: string;
  name: string;
  volume: Kobo;
  count: number;
}

export interface Overview {
  range: Range;
  /** Inclusive Lagos days, YYYY-MM-DD. */
  from: string;
  to: string;
  kpis: {
    /** Successful money moved, in kobo. */
    volume: Kpi;
    transactions: Kpi;
    /** Successful ÷ completed (pending excluded), 0–1. */
    successRate: Kpi;
    /** Fees earned on successful transactions, in kobo. */
    fees: Kpi;
  };
  daily: DailyVolume[];
  statuses: { status: TransactionStatus; count: number }[];
  topBusinesses: BusinessVolume[];
}

function summarise(transactions: readonly Transaction[]) {
  const successful = transactions.filter((t) => t.status === "successful");
  const completed = transactions.filter((t) => t.status !== "pending").length;
  return {
    volume: sumKobo(successful.map((t) => t.amount)),
    transactions: transactions.length,
    successRate: completed === 0 ? 0 : successful.length / completed,
    fees: sumKobo(successful.map((t) => t.fee)),
  };
}

function kpi(current: number, previous: number): Kpi {
  return {
    current,
    previous,
    change: previous === 0 ? null : (current - previous) / previous,
  };
}

/**
 * Everything the overview page shows, for the `range` Lagos days ending on
 * `to`, compared with the same number of days before that. Pure, so it's
 * tested directly.
 */
export function computeOverview(
  transactions: readonly Transaction[],
  range: Range,
  to: string,
): Overview {
  const from = addDays(to, -(range - 1));
  const previousFrom = addDays(from, -range);

  const current: Transaction[] = [];
  const previous: Transaction[] = [];
  for (const txn of transactions) {
    const day = lagosDay(txn.createdAt);
    if (day >= from && day <= to) current.push(txn);
    else if (day >= previousFrom && day < from) previous.push(txn);
  }

  const now = summarise(current);
  const before = summarise(previous);

  // One entry per day, including days with no activity, so the chart has no gaps
  const byDay = new Map<string, { collections: number; payouts: number }>();
  for (let i = 0; i < range; i++) {
    byDay.set(addDays(from, i), { collections: 0, payouts: 0 });
  }
  for (const txn of current) {
    if (txn.status !== "successful") continue;
    const bucket = byDay.get(lagosDay(txn.createdAt))!;
    if (txn.type === "collection") bucket.collections += txn.amount;
    else if (txn.type === "payout") bucket.payouts += txn.amount;
  }

  const businesses = new Map<string, BusinessVolume>();
  for (const txn of current) {
    if (txn.status !== "successful") continue;
    const entry = businesses.get(txn.businessId) ?? {
      id: txn.businessId,
      name: txn.businessName,
      volume: kobo(0),
      count: 0,
    };
    entry.volume = kobo(entry.volume + txn.amount);
    entry.count += 1;
    businesses.set(txn.businessId, entry);
  }

  return {
    range,
    from,
    to,
    kpis: {
      volume: kpi(now.volume, before.volume),
      transactions: kpi(now.transactions, before.transactions),
      successRate: kpi(now.successRate, before.successRate),
      fees: kpi(now.fees, before.fees),
    },
    daily: [...byDay].map(([day, v]) => ({
      day,
      collections: kobo(v.collections),
      payouts: kobo(v.payouts),
    })),
    statuses: transactionStatuses.map((status) => ({
      status,
      count: current.filter((t) => t.status === status).length,
    })),
    topBusinesses: [...businesses.values()]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5),
  };
}
