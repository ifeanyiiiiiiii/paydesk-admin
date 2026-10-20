import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { RequirePermission } from "@/components/require-permission";

export const metadata: Metadata = { title: "Businesses" };

export default function BusinessesPage() {
  return (
    <RequirePermission permission="businesses:view">
      <ComingSoon
        title="Businesses"
        description="Merchants on the platform, their verification status and activity."
      />
    </RequirePermission>
  );
}
