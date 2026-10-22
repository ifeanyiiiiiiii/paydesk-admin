import type { NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { channelLabels, statusLabels, typeLabels } from "@/lib/data/types";
import { toNairaDecimal } from "@/lib/money";
import { parseTransactionQuery } from "@/lib/transactions/query";
import { exportTransactions } from "@/lib/transactions/service";

const headers = [
  "Reference",
  "Transaction ID",
  "Created at (UTC)",
  "Business",
  "Customer",
  "Type",
  "Channel",
  "Status",
  "Amount (NGN)",
  "Fee (NGN)",
];

/**
 * GET /transactions/export?status=failed&q=...
 * Downloads every transaction matching the same filters as the table (all
 * pages, not just the visible one) as CSV.
 */
export async function GET(request: NextRequest) {
  const query = parseTransactionQuery(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const rows = await exportTransactions(query);
  if (!rows) {
    return new Response("You don't have permission to export transactions.", {
      status: 403,
    });
  }

  const csv = toCsv(
    headers,
    rows.map((txn) => [
      txn.reference,
      txn.id,
      txn.createdAt,
      txn.businessName,
      txn.customerName,
      typeLabels[txn.type],
      channelLabels[txn.channel],
      statusLabels[txn.status],
      toNairaDecimal(txn.amount),
      toNairaDecimal(txn.fee),
    ]),
  );

  const today = new Date().toISOString().slice(0, 10);
  // The byte-order mark makes Excel open the file as UTF-8
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paydesk-transactions-${today}.csv"`,
      // Exports contain customer data, so never cache them
      "Cache-Control": "private, no-store",
    },
  });
}
