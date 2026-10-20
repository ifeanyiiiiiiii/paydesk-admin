import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { RequirePermission } from "@/components/require-permission";

export const metadata: Metadata = { title: "Wallets" };

export default function WalletsPage() {
  return (
    <RequirePermission permission="wallets:view">
      <ComingSoon
        title="Wallets"
        description="Business wallet balances, freeze and unfreeze, and withdrawals with fee quotes."
      />
    </RequirePermission>
  );
}
