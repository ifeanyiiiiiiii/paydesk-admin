import Link from "next/link";
import type { BusinessVolume } from "@/lib/analytics/overview";
import { transactionsHref } from "@/lib/analytics/links";
import { formatCount } from "@/lib/format";
import { formatNaira } from "@/lib/money";

/** The five businesses with the most successful volume; each opens its transactions. */
export function TopBusinesses({
  businesses,
  from,
  to,
}: {
  businesses: BusinessVolume[];
  from: string;
  to: string;
}) {
  if (businesses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No successful payments in this period.
      </p>
    );
  }
  const max = businesses[0].volume;

  return (
    <ol className="space-y-1">
      {businesses.map((business, i) => (
        <li key={business.id}>
          <Link
            href={transactionsHref({ q: business.name, from, to })}
            className="block space-y-1.5 rounded-lg p-2 transition-colors hover:bg-muted"
          >
            <span className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-4 text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="truncate">{business.name}</span>
              </span>
              <span className="shrink-0 text-right tabular-nums">
                {formatNaira(business.volume, { compact: true })}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {formatCount(business.count)} txns
                </span>
              </span>
            </span>
            {/* One series, so one colour for every bar; length carries the value */}
            <span
              className="ml-6 block h-1.5 rounded-full bg-muted"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-series-collections"
                style={{ width: `${(business.volume / max) * 100}%` }}
              />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
