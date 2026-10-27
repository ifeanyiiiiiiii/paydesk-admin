"use client";

import { BadgeCheck, Clock, Lock, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BusinessRow } from "@/lib/businesses/businesses";
import { formatCount } from "@/lib/format";
import { formatNaira } from "@/lib/money";

const joinedFormat = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  month: "short",
  year: "numeric",
});

/**
 * The business directory. With only a couple of dozen businesses, filtering
 * in the browser is instant and simpler than a server round trip.
 */
export function BusinessesTable({ rows }: { rows: BusinessRow[] }) {
  const [search, setSearch] = useState("");
  // Keeps typing responsive even if filtering ever gets heavier
  const query = useDeferredValue(search.trim().toLowerCase());

  const visible = query
    ? rows.filter((row) =>
        [row.name, row.category, row.city].some((field) =>
          field.toLowerCase().includes(query),
        ),
      )
    : rows;

  return (
    <div className="space-y-3">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, category or city"
          aria-label="Search businesses"
          className="pl-8"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Business</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead className="text-right">Last 30 days</TableHead>
              <TableHead className="text-right">Wallet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-40 text-center">
                  <SearchX className="mx-auto mb-2 size-6 text-muted-foreground" />
                  <p className="font-medium">
                    No businesses match &ldquo;{search}&rdquo;
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">
                    <span className="font-medium">{row.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.category} · {row.city} · since{" "}
                      {joinedFormat.format(new Date(row.joinedAt))}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.verification === "verified" ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      >
                        <BadgeCheck aria-hidden />
                        Verified
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      >
                        <Clock aria-hidden />
                        Pending checks
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Link
                      href={`/transactions?q=${encodeURIComponent(row.name)}`}
                      className="font-medium tabular-nums underline-offset-4 hover:underline"
                    >
                      {formatNaira(row.volume30d, { compact: true })}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {formatCount(row.transactions30d)} payments
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <span className="font-medium tabular-nums">
                      {formatNaira(row.balance)}
                    </span>
                    {row.walletStatus === "frozen" && (
                      <span className="flex items-center justify-end gap-1 text-xs text-red-700 dark:text-red-400">
                        <Lock className="size-3" aria-hidden />
                        Frozen
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {visible.length} of {rows.length} businesses. Click a 30-day
        total to see its transactions.
      </p>
    </div>
  );
}
