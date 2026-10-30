import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePermission } from "@/components/require-permission";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletsView } from "@/components/wallets/wallets-view";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { getWalletsFor } from "@/lib/wallets/service";

export const metadata: Metadata = { title: "Wallets" };

export default function WalletsPage() {
  return (
    <RequirePermission permission="wallets:view">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Wallets</h2>
          <p className="text-sm text-muted-foreground">
            Money settled to each business. Freezing a wallet stops any money
            leaving it.
          </p>
        </div>
        <Suspense fallback={<WalletsSkeleton />}>
          <WalletsContent />
        </Suspense>
        <p className="text-xs text-muted-foreground">
          Demo note: changes you make are saved for your browser only, so every
          visitor gets their own copy to try things out.
        </p>
      </div>
    </RequirePermission>
  );
}

async function WalletsContent() {
  const user = await getCurrentUser();
  const wallets = await getWalletsFor(user.role);
  return (
    <WalletsView
      initialWallets={wallets}
      canFreeze={can(user.role, "wallets:freeze")}
      canWithdraw={can(user.role, "wallets:withdraw")}
    />
  );
}

function WalletsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
