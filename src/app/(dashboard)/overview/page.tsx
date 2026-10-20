import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { RequirePermission } from "@/components/require-permission";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <RequirePermission permission="overview:view">
      <ComingSoon
        title="Overview"
        description="Headline numbers and volume charts. Click any chart to open the matching transactions."
      />
    </RequirePermission>
  );
}
