import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { RequirePermission } from "@/components/require-permission";

export const metadata: Metadata = { title: "Fees" };

export default function FeesPage() {
  return (
    <RequirePermission permission="fees:view">
      <ComingSoon
        title="Fees"
        description="Default and custom fee rules: percentage, flat fee and cap."
      />
    </RequirePermission>
  );
}
