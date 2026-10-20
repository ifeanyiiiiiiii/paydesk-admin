import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { RequirePermission } from "@/components/require-permission";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditLogPage() {
  return (
    <RequirePermission permission="audit:view">
      <ComingSoon
        title="Audit log"
        description="A record of every action taken by an admin."
      />
    </RequirePermission>
  );
}
