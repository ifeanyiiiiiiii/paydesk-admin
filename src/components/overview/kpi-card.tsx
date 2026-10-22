import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Kpi } from "@/lib/analytics/overview";
import { cn } from "@/lib/utils";

/**
 * A headline number with its change vs the previous period. The change is
 * shown with an icon and a sign as well as colour, so it never relies on
 * colour alone.
 */
export function KpiCard({
  label,
  value,
  kpi,
  rangeLabel,
  changeAs = "percent",
}: {
  label: string;
  value: string;
  kpi: Kpi;
  rangeLabel: string;
  /** "points" shows the difference of two rates (e.g. +1.2 pts) instead of a relative change. */
  changeAs?: "percent" | "points";
}) {
  const delta =
    changeAs === "points" ? (kpi.current - kpi.previous) * 100 : kpi.change;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <Change delta={delta} changeAs={changeAs} rangeLabel={rangeLabel} />
      </CardContent>
    </Card>
  );
}

function Change({
  delta,
  changeAs,
  rangeLabel,
}: {
  delta: number | null;
  changeAs: "percent" | "points";
  rangeLabel: string;
}) {
  if (delta === null) {
    return (
      <p className="text-xs text-muted-foreground">
        No data for the previous period
      </p>
    );
  }

  // Treat tiny changes as flat so rounding doesn't show "+0.0%" in green
  const flat = Math.abs(changeAs === "points" ? delta : delta * 100) < 0.05;
  const up = delta > 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const text =
    changeAs === "points"
      ? `${up ? "+" : ""}${delta.toFixed(1)} pts`
      : `${up ? "+" : ""}${(delta * 100).toFixed(1)}%`;

  return (
    <p className="flex flex-wrap items-center gap-x-1 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium whitespace-nowrap tabular-nums",
          flat
            ? "text-muted-foreground"
            : up
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-red-700 dark:text-red-400",
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {flat ? "No change" : text}
      </span>
      <span className="text-muted-foreground">vs previous {rangeLabel}</span>
    </p>
  );
}
