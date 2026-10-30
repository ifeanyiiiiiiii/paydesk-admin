import type { Metadata } from "next";
import { Suspense } from "react";
import { FeesView } from "@/components/fees/fees-view";
import { RequirePermission } from "@/components/require-permission";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { getBusinesses } from "@/lib/data/store";
import { getFees } from "@/lib/fees/service";

export const metadata: Metadata = { title: "Fees" };

export default function FeesPage() {
  return (
    <RequirePermission permission="fees:view">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Fees</h2>
          <p className="text-sm text-muted-foreground">
            What PayDesk charges. A change applies from the next transaction;
            past transactions keep the fee they were charged.
          </p>
        </div>
        <Suspense fallback={<FeesSkeleton />}>
          <FeesContent />
        </Suspense>
        <p className="text-xs text-muted-foreground">
          Demo note: changes are saved for your browser only. Withdrawals are
          the only new transactions in the demo, so that&apos;s where a changed
          rule shows up: try it on the Wallets page.
        </p>
      </div>
    </RequirePermission>
  );
}

async function FeesContent() {
  const [user, fees] = await Promise.all([getCurrentUser(), getFees()]);
  return (
    <FeesView
      initialFees={fees}
      businesses={getBusinesses().map(({ id, name }) => ({ id, name }))}
      canManage={can(user.role, "fees:manage")}
    />
  );
}

function FeesSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
