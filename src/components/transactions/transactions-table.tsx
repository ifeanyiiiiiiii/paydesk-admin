import { SearchX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { channelLabels, type Transaction, typeLabels } from "@/lib/data/types";
import { formatDateTime } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { StatusBadge } from "./status-badge";

export function TransactionsTable({ rows }: { rows: Transaction[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Business</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="h-48 text-center">
                <SearchX className="mx-auto mb-2 size-6 text-muted-foreground" />
                <p className="font-medium">
                  No transactions match these filters
                </p>
                <p className="text-sm text-muted-foreground">
                  Try a different search or clear the filters.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(txn.createdAt)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {txn.reference}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {txn.businessName}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {txn.customerName}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {typeLabels[txn.type]}
                  <span className="block text-xs text-muted-foreground">
                    {channelLabels[txn.channel]}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                  {formatNaira(txn.amount)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={txn.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
