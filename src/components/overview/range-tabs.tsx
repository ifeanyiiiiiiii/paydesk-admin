import Link from "next/link";
import { RANGES, type Range } from "@/lib/analytics/overview";
import { cn } from "@/lib/utils";

/** 7 / 30 / 90 days. Plain links, so the range lives in the URL like other filters. */
export function RangeTabs({ current }: { current: Range }) {
  return (
    <nav
      aria-label="Time range"
      className="inline-flex rounded-lg border bg-muted/50 p-0.5 text-sm"
    >
      {RANGES.map((range) => (
        <Link
          key={range}
          href={range === 30 ? "/overview" : `/overview?range=${range}`}
          aria-current={range === current ? "page" : undefined}
          scroll={false}
          className={cn(
            "rounded-md px-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
            range === current &&
              "bg-background font-medium text-foreground shadow-sm",
          )}
        >
          {range} days
        </Link>
      ))}
    </nav>
  );
}
