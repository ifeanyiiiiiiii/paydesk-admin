"use client";

import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyVolume } from "@/lib/analytics/overview";
import {
  formatDay,
  formatLongDay,
  transactionsHref,
} from "@/lib/analytics/links";
import { formatNaira, kobo, sumKobo } from "@/lib/money";

const series = [
  {
    key: "collections",
    label: "Collections",
    colour: "var(--series-collections)",
  },
  { key: "payouts", label: "Payouts", colour: "var(--series-payouts)" },
] as const;

/**
 * Successful collections and payouts per day, on one shared axis (both are
 * naira). Hover shows a crosshair and exact amounts; clicking a day opens
 * that day's transactions.
 */
export function VolumeChart({ data }: { data: DailyVolume[] }) {
  const router = useRouter();
  const totals = {
    collections: sumKobo(data.map((d) => d.collections)),
    payouts: sumKobo(data.map((d) => d.payouts)),
  };

  return (
    <div className="space-y-3">
      {/* Legend with period totals, so identity never depends on colour alone */}
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ background: s.colour }}
              aria-hidden
            />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium tabular-nums">
              {formatNaira(totals[s.key])}
            </span>
          </li>
        ))}
      </ul>

      <div
        className="h-72 w-full cursor-pointer"
        role="img"
        aria-label={`Daily successful collections and payouts from ${formatLongDay(data[0].day)} to ${formatLongDay(data[data.length - 1].day)}. A table of the same data is below.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onClick={(state) => {
              const day = state?.activeLabel;
              if (typeof day === "string") {
                router.push(transactionsHref({ from: day, to: day }));
              }
            }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="day"
              tickFormatter={formatDay}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              minTickGap={32}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v: number) =>
                formatNaira(kobo(Math.round(v)), { compact: true })
              }
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              width={64}
            />
            <Tooltip
              content={(props) => (
                <VolumeTooltip
                  active={props.active}
                  payload={props.payload}
                  label={props.label}
                />
              )}
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={s.label}
                stroke={s.colour}
                strokeWidth={2}
                dot={false}
                // A surface-coloured ring keeps the hover dot readable over the other line
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VolumeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  label?: unknown;
}) {
  if (!active || !payload?.length || typeof label !== "string") return null;

  return (
    <div className="min-w-48 rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium">{formatLongDay(label)}</p>
      <ul className="space-y-1">
        {series.map((s) => {
          const value = Number(
            payload.find((p) => p.dataKey === s.key)?.value ?? 0,
          );
          return (
            <li key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ background: s.colour }}
                  aria-hidden
                />
                {s.label}
              </span>
              <span className="font-medium tabular-nums">
                {formatNaira(kobo(value))}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Click to see this day&apos;s transactions
      </p>
    </div>
  );
}
