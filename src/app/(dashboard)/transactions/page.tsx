import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { RequirePermission } from "@/components/require-permission";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return (
    <RequirePermission permission="transactions:view">
      <ComingSoon
        title="Transactions"
        description="Every payment and payout, with server-side pagination, filters kept in the URL, search and CSV export."
      />
    </RequirePermission>
  );
}
