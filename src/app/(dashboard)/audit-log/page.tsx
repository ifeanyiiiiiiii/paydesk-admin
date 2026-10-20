import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditLogPage() {
  return (
    <ComingSoon
      title="Audit log"
      description="A record of every action taken by an admin."
    />
  );
}
