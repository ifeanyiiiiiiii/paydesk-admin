import type { Metadata } from "next";
import { Suspense } from "react";
import { KpiCard } from "@/components/overview/kpi-card";
import { RangeTabs } from "@/components/overview/range-tabs";
import { StatusBreakdown } from "@/components/overview/status-breakdown";
import { TopBusinesses } from "@/components/overview/top-businesses";
import { VolumeChart } from "@/components/overview/volume-chart";
import { VolumeTable } from "@/components/overview/volume-table";
import { RequirePermission } from "@/components/require-permission";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLongDay } from "@/lib/analytics/links";
import { rangeSchema } from "@/lib/analytics/overview";
import { getOverview } from "@/lib/analytics/service";
import { formatCount } from "@/lib/format";
import { formatNaira, kobo } from "@/lib/money";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage({ searchParams }: PageProps<"/overview">) {
  return (
    <RequirePermission permission="overview:view">
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent searchParams={searchParams} />
      </Suspense>
    </RequirePermission>
  );
}

async function OverviewContent({
  searchParams,
}: {
  searchParams: PageProps<"/overview">["searchParams"];
}) {
  const range = rangeSchema.parse((await searchParams).range);
  const overview = await getOverview(range);
  const { kpis, from, to } = overview;
  const rangeLabel = `${range} days`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">
            {formatLongDay(from)} – {formatLongDay(to)}, Lagos time
          </p>
        </div>
        <RangeTabs current={range} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Volume processed"
          value={formatNaira(kobo(kpis.volume.current), { compact: true })}
          kpi={kpis.volume}
          rangeLabel={rangeLabel}
        />
        <KpiCard
          label="Transactions"
          value={formatCount(kpis.transactions.current)}
          kpi={kpis.transactions}
          rangeLabel={rangeLabel}
        />
        <KpiCard
          label="Success rate"
          value={`${(kpis.successRate.current * 100).toFixed(1)}%`}
          kpi={kpis.successRate}
          rangeLabel={rangeLabel}
          changeAs="points"
        />
        <KpiCard
          label="Fees earned"
          value={formatNaira(kobo(kpis.fees.current), { compact: true })}
          kpi={kpis.fees}
          rangeLabel={rangeLabel}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily volume</CardTitle>
          <CardDescription>
            Successful collections and payouts per day. Click a day to see its
            transactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <VolumeChart data={overview.daily} />
          <VolumeTable data={overview.daily} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transactions by status</CardTitle>
            <CardDescription>All transactions in the period.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusBreakdown statuses={overview.statuses} from={from} to={to} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top businesses</CardTitle>
            <CardDescription>
              By successful volume in the period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopBusinesses
              businesses={overview.topBusinesses}
              from={from}
              to={to}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
