import Link from "next/link";
import type { DailyVolume } from "@/lib/analytics/overview";
import { formatLongDay, transactionsHref } from "@/lib/analytics/links";
import { formatNaira } from "@/lib/money";

/**
 * The chart's data as a table, collapsed by default. It's the accessible
 * version of the chart (screen readers, keyboard, exact values), and each
 * day links to its transactions like clicking the chart does.
 */
export function VolumeTable({ data }: { data: DailyVolume[] }) {
  return (
    <details className="group text-sm">
      <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
        Show as table
      </summary>
      <div className="mt-3 max-h-80 overflow-auto rounded-lg border">
        <table className="w-full">
          <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Day</th>
              <th className="px-3 py-2 text-right font-medium">Collections</th>
              <th className="px-3 py-2 text-right font-medium">Payouts</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.day} className="border-t">
                <td className="px-3 py-1.5">
                  <Link
                    href={transactionsHref({ from: d.day, to: d.day })}
                    className="underline-offset-4 hover:underline"
                  >
                    {formatLongDay(d.day)}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {formatNaira(d.collections)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {formatNaira(d.payouts)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
