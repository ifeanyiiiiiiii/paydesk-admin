import type { Metadata } from "next";
import { Suspense } from "react";
import { BusinessesTable } from "@/components/businesses/businesses-table";
import { RequirePermission } from "@/components/require-permission";
import { Skeleton } from "@/components/ui/skeleton";
import { listBusinesses } from "@/lib/businesses/service";

export const metadata: Metadata = { title: "Businesses" };

export default function BusinessesPage() {
  return (
    <RequirePermission permission="businesses:view">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Businesses</h2>
          <p className="text-sm text-muted-foreground">
            Every merchant on PayDesk, their verification status, recent
            activity and wallet.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <BusinessesContent />
        </Suspense>
      </div>
    </RequirePermission>
  );
}

async function BusinessesContent() {
  return <BusinessesTable rows={await listBusinesses()} />;
}
