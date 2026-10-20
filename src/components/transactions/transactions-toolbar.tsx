"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  statusLabels,
  transactionStatuses,
  transactionTypes,
  typeLabels,
} from "@/lib/data/types";
import { parseTransactionQuery } from "@/lib/transactions/query";
import { useUpdateQuery } from "./use-update-query";

const ALL = "all";
const SEARCH_DELAY_MS = 300;

const statusItems = [
  { value: ALL, label: "All statuses" },
  ...transactionStatuses.map((s) => ({ value: s, label: statusLabels[s] })),
];
const typeItems = [
  { value: ALL, label: "All types" },
  ...transactionTypes.map((t) => ({ value: t, label: typeLabels[t] })),
];

export function TransactionsToolbar() {
  const { searchParams, update, isPending } = useUpdateQuery();
  const urlSearch = searchParams.get("q") ?? "";

  // The input updates instantly; the URL (and so the server query) only
  // updates once typing pauses, instead of on every keystroke.
  const [search, setSearch] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // If the URL changes from elsewhere (Back button, Clear), follow it
  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch);
    setSearch(urlSearch);
  }

  function onSearchChange(value: string) {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => update({ q: value.trim() || null }),
      SEARCH_DELAY_MS,
    );
  }

  // Same validation as the server, so a hand-edited URL like ?status=oops
  // shows "All statuses" here, matching the results below
  const query = parseTransactionQuery(Object.fromEntries(searchParams));
  const status = query.status ?? ALL;
  const type = query.type ?? ALL;
  const from = query.from ?? "";
  const to = query.to ?? "";
  const hasFilters = Boolean(
    query.q || query.status || query.type || from || to,
  );

  function clearAll() {
    clearTimeout(timer.current);
    setSearch("");
    update({ q: null, status: null, type: null, from: null, to: null });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search reference, customer or business"
          aria-label="Search transactions"
          className="pl-8"
        />
      </div>

      <Select
        items={statusItems}
        value={status}
        onValueChange={(value) =>
          update({ status: value === ALL ? null : value })
        }
      >
        <SelectTrigger aria-label="Filter by status" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={typeItems}
        value={type}
        onValueChange={(value) =>
          update({ type: value === ALL ? null : value })
        }
      >
        <SelectTrigger aria-label="Filter by type" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {typeItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => update({ from: e.target.value || null })}
          aria-label="From date"
          className="w-36"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => update({ to: e.target.value || null })}
          aria-label="To date"
          className="w-36"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X />
          Clear
        </Button>
      )}

      {isPending && (
        <Loader2
          className="size-4 animate-spin text-muted-foreground"
          aria-label="Updating results"
        />
      )}
    </div>
  );
}
