import "server-only";
import { getUserWithPermission } from "@/lib/auth/dal";
import { getSandbox } from "@/lib/sandbox/sandbox";
import { type AuditEntry, auditLogFor } from "./audit";

/** The full log as this visitor sees it, or null without audit:view. */
export async function getAuditLog(): Promise<AuditEntry[] | null> {
  if (!(await getUserWithPermission("audit:view"))) return null;
  return auditLogFor((await getSandbox()).audit);
}
