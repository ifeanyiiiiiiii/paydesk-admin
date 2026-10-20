import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Wallets" };

export default function WalletsPage() {
  return (
    <ComingSoon
      title="Wallets"
      description="Business wallet balances, freeze and unfreeze, and withdrawals with fee quotes."
    />
  );
}
