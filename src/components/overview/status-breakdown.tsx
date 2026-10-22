import {
  CheckCircle2,
  Clock,
  type LucideIcon,
  Undo2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { transactionsHref } from "@/lib/analytics/links";
import { statusLabels, type TransactionStatus } from "@/lib/data/types";
import { formatCount } from "@/lib/format";

// Reserved status colours, always paired with an icon and a label
const statusStyle: Record<
  TransactionStatus,
  { colour: string; icon: LucideIcon }
> = {
  successful: { colour: "var(--status-good, #0ca30c)", icon: CheckCircle2 },
  pending: { colour: "var(--status-warning, #fab219)", icon: Clock },
  reversed: { colour: "var(--status-serious, #ec835a)", icon: Undo2 },
  failed: { colour: "var(--status-critical, #d03b3b)", icon: XCircle },
};

/** Share of transactions by status; each row opens those transactions. */
export function StatusBreakdown({
  statuses,
  from,
  to,
}: {
  statuses: { status: TransactionStatus; count: number }[];
  from: string;
  to: string;
}) {
  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <ul className="space-y-1">
      {statuses.map(({ status, count }) => {
        const share = total === 0 ? 0 : count / total;
        const { colour, icon: Icon } = statusStyle[status];
        return (
          <li key={status}>
            <Link
              href={transactionsHref({ status, from, to })}
              className="block space-y-1.5 rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <span className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <Icon
                    className="size-4"
                    style={{ color: colour }}
                    aria-hidden
                  />
                  {statusLabels[status]}
                </span>
                <span className="tabular-nums">
                  {formatCount(count)}{" "}
                  <span className="text-muted-foreground">
                    ({(share * 100).toFixed(1)}%)
                  </span>
                </span>
              </span>
              <span className="block h-1.5 rounded-full bg-muted" aria-hidden>
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${share * 100}%`, background: colour }}
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
