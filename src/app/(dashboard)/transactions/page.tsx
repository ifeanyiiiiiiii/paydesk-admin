import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/require-permission";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { TransactionsPagination } from "@/components/transactions/transactions-pagination";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionsToolbar } from "@/components/transactions/transactions-toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  parseTransactionQuery,
  type TransactionQuery,
  toSearchParams,
} from "@/lib/transactions/query";
import {
  canExportTransactions,
  getTransaction,
  listTransactions,
} from "@/lib/transactions/service";

export const metadata: Metadata = { title: "Transactions" };

type SearchParams = PageProps<"/transactions">["searchParams"];

export default function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  return (
    <RequirePermission permission="transactions:view">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Transactions
            </h2>
            <p className="text-sm text-muted-foreground">
              Every collection, payout and refund across all businesses.
            </p>
          </div>
          <Suspense>
            <ExportButton searchParams={searchParams} />
          </Suspense>
        </div>

        {/* These depend on the URL, so they render at request time */}
        <Suspense fallback={<Skeleton className="h-8 w-full max-w-3xl" />}>
          <TransactionsToolbar />
        </Suspense>
        <Suspense fallback={<ResultsSkeleton />}>
          <TransactionsResults searchParams={searchParams} />
        </Suspense>
      </div>
    </RequirePermission>
  );
}

async function TransactionsResults({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = parseTransactionQuery(params);
  const result = await listTransactions(query);

  const txnId = typeof params.txn === "string" ? params.txn : null;
  const selected = txnId ? await getTransaction(txnId) : null;

  return (
    <div className="space-y-3">
      <TransactionsTable
        rows={result.rows}
        detailsHref={(id) => hrefWith(query, { txn: id })}
      />
      <TransactionsPagination
        page={result.page}
        pageCount={result.pageCount}
        pageSize={result.pageSize}
        total={result.total}
      />
      {selected && (
        <TransactionSheet
          // A new key per transaction resets the sheet when switching rows
          key={selected.id}
          transaction={selected}
          closeHref={hrefWith(query)}
        />
      )}
    </div>
  );
}

/** Only shown to roles with transactions:export; downloads the current filters. */
async function ExportButton({ searchParams }: { searchParams: SearchParams }) {
  if (!(await canExportTransactions())) return null;

  const params = toSearchParams(parseTransactionQuery(await searchParams));
  // Export covers every matching row, not just the current page
  params.delete("page");
  params.delete("pageSize");
  const query = params.toString();

  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={
        <a href={`/transactions/export${query ? `?${query}` : ""}`} download />
      }
    >
      <Download />
      Export CSV
    </Button>
  );
}

function hrefWith(query: TransactionQuery, extra: Record<string, string> = {}) {
  const params = toSearchParams(query);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const search = params.toString();
  return search ? `?${search}` : "?";
}

function ResultsSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
