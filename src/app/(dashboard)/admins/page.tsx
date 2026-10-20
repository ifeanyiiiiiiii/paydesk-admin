import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { RequirePermission } from "@/components/require-permission";

export const metadata: Metadata = { title: "Admin users" };

export default function AdminsPage() {
  return (
    <RequirePermission permission="admins:view">
      <ComingSoon
        title="Admin users"
        description="Admin accounts and the roles that decide what each one can see and do."
      />
    </RequirePermission>
  );
}
