import { z } from "zod";
import {
  type Transaction,
  transactionStatuses,
  transactionTypes,
} from "@/lib/data/types";

export const PAGE_SIZES = [10, 25, 50, 100] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Validates the transactions page's URL search params. Anything invalid falls
 * back to a default instead of erroring, so a hand-edited or stale link still
 * opens a working page.
 */
export const transactionQuerySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(transactionStatuses).optional().catch(undefined),
  type: z.enum(transactionTypes).optional().catch(undefined),
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .refine((n) => (PAGE_SIZES as readonly number[]).includes(n))
    .catch(25),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;

type SearchParams = Record<string, string | string[] | undefined>;

export function parseTransactionQuery(params: SearchParams): TransactionQuery {
  // Repeated params (?status=a&status=b) aren't supported: take the first
  const first = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  return transactionQuerySchema.parse({ q: "", ...first });
}

/**
 * Turns a query back into URL search params, leaving out defaults so links
 * stay short (page 1 and 25 per page don't appear in the URL).
 */
export function toSearchParams(query: TransactionQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.type) params.set("type", query.type);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== 25) params.set("pageSize", String(query.pageSize));
  return params;
}

export interface TransactionPage {
  rows: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Lagos has no daylight saving, so it's always UTC+1. */
const LAGOS_OFFSET = "+01:00";

/** Applies search and filters, without paginating. Used by the table and CSV export. */
export function filterTransactions(
  transactions: readonly Transaction[],
  query: TransactionQuery,
): Transaction[] {
  const search = query.q.toLowerCase();
  // Date filters are whole days in Lagos time, matching how dates are shown.
  // Using UTC here would let a payment shown as 21 Oct 00:30 match "to 20 Oct".
  const fromTime = query.from
    ? Date.parse(`${query.from}T00:00:00${LAGOS_OFFSET}`)
    : -Infinity;
  const toTime = query.to
    ? Date.parse(`${query.to}T23:59:59.999${LAGOS_OFFSET}`)
    : Infinity;

  return transactions.filter((txn) => {
    if (query.status && txn.status !== query.status) return false;
    if (query.type && txn.type !== query.type) return false;
    const time = Date.parse(txn.createdAt);
    if (time < fromTime || time > toTime) return false;
    if (
      search &&
      !txn.reference.toLowerCase().includes(search) &&
      !txn.id.includes(search) &&
      !txn.customerName.toLowerCase().includes(search) &&
      !txn.businessName.toLowerCase().includes(search)
    ) {
      return false;
    }
    return true;
  });
}

/** Filters, searches and paginates. Pure, so it's easy to test. */
export function queryTransactions(
  transactions: readonly Transaction[],
  query: TransactionQuery,
): TransactionPage {
  const matches = filterTransactions(transactions, query);
  const pageCount = Math.max(1, Math.ceil(matches.length / query.pageSize));
  // A page past the end (e.g. after narrowing a filter) shows the last page
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * query.pageSize;

  return {
    rows: matches.slice(start, start + query.pageSize),
    total: matches.length,
    page,
    pageSize: query.pageSize,
    pageCount,
  };
}
