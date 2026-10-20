import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/require-permission";
import { TransactionsPagination } from "@/components/transactions/transactions-pagination";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionsToolbar } from "@/components/transactions/transactions-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { parseTransactionQuery } from "@/lib/transactions/query";
import { listTransactions } from "@/lib/transactions/service";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  return (
    <RequirePermission permission="transactions:view">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Transactions</h2>
          <p className="text-sm text-muted-foreground">
            Every collection, payout and refund across all businesses.
          </p>
        </div>

        {/* Both depend on the URL, so they render at request time */}
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
  searchParams: PageProps<"/transactions">["searchParams"];
}) {
  const query = parseTransactionQuery(await searchParams);
  const result = await listTransactions(query);

  return (
    <div className="space-y-3">
      <TransactionsTable rows={result.rows} />
      <TransactionsPagination
        page={result.page}
        pageCount={result.pageCount}
        pageSize={result.pageSize}
        total={result.total}
      />
    </div>
  );
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
