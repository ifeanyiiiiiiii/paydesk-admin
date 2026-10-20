"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/format";
import { PAGE_SIZES } from "@/lib/transactions/query";
import { useUpdateQuery } from "./use-update-query";

const sizeItems = PAGE_SIZES.map((size) => ({
  value: String(size),
  label: `${size} per page`,
}));

export function TransactionsPagination({
  page,
  pageCount,
  pageSize,
  total,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}) {
  const { searchParams, update } = useUpdateQuery();

  function pageHref(target: number) {
    const params = new URLSearchParams(searchParams);
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const query = params.toString();
    return query ? `?${query}` : "?";
  }

  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Showing {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
      </p>

      <div className="flex items-center gap-2">
        <Select
          items={sizeItems}
          value={String(pageSize)}
          onValueChange={(value) =>
            update({ pageSize: value === "25" ? null : value })
          }
        >
          <SelectTrigger aria-label="Rows per page" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="px-1 text-muted-foreground tabular-nums">
          Page {formatCount(page)} of {formatCount(pageCount)}
        </span>

        <PageLink
          href={pageHref(page - 1)}
          disabled={page <= 1}
          label="Previous page"
        >
          <ChevronLeft />
        </PageLink>
        <PageLink
          href={pageHref(page + 1)}
          disabled={page >= pageCount}
          label="Next page"
        >
          <ChevronRight />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="icon" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      // Renders a link, not a <button>, so tell Base UI not to add button semantics
      nativeButton={false}
      render={<Link href={href} scroll={false} />}
    >
      {children}
    </Button>
  );
}
