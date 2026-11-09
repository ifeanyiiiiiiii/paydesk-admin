import type { User } from "@/lib/auth/demo-users";
import type { Role } from "@/lib/auth/permissions";

/**
 * The audit log: who did what, and when. Append-only by design: there's no
 * function, route or button to edit or delete an entry, for anyone.
 */

export const auditActions = {
  "wallet.freeze": { label: "Froze a wallet", category: "wallets" },
  "wallet.unfreeze": { label: "Unfroze a wallet", category: "wallets" },
  "withdrawal.create": { label: "Made a withdrawal", category: "withdrawals" },
  "fee.default.update": { label: "Changed a default fee", category: "fees" },
  "fee.custom.set": { label: "Set a custom rate", category: "fees" },
  "fee.custom.remove": { label: "Removed a custom rate", category: "fees" },
  "admin.invite": { label: "Invited an admin", category: "admins" },
  "admin.revoke": { label: "Revoked an invite", category: "admins" },
  "admin.role": { label: "Changed a role", category: "admins" },
  "admin.deactivate": { label: "Deactivated an admin", category: "admins" },
  "admin.reactivate": { label: "Reactivated an admin", category: "admins" },
  "transactions.export": { label: "Exported transactions", category: "exports" },
} as const;
export type AuditAction = keyof typeof auditActions;

export const auditCategories = {
  wallets: "Wallets",
  withdrawals: "Withdrawals",
  fees: "Fees",
  admins: "Admins",
  exports: "Exports",
} as const;
export type AuditCategory = keyof typeof auditCategories;

export interface AuditEntry {
  id: string;
  /** ISO 8601. */
  at: string;
  /** Who did it, as they were named at the time. */
  actor: string;
  /** Their role at the time. Missing for automated systems. */
  actorRole?: Role;
  action: AuditAction;
  /** What it was done to, in words: a business, an admin, a fee channel. */
  target: string;
  /** The specifics: a reason, an amount, "old → new". */
  detail?: string;
}

/** History from the seed data, matching what the other pages show. All fictional. */
const seedEntries: AuditEntry[] = [
  {
    id: "seed_07",
    at: "2026-10-21T09:25:00.000Z",
    actor: "Adaeze Okafor",
    actorRole: "super_admin",
    action: "fee.custom.set",
    target: "Bright Minds Tutors · USSD",
    detail: "2%, max ₦1,000 → 1.5%, max ₦500",
  },
  {
    id: "seed_06",
    at: "2026-10-21T09:20:00.000Z",
    actor: "Adaeze Okafor",
    actorRole: "super_admin",
    action: "fee.custom.set",
    target: "Ikeja Gadgets Hub · Card",
    detail: "1.5% + ₦100, max ₦2,000 → 1.2% + ₦50, max ₦1,500",
  },
  {
    id: "seed_05",
    at: "2026-10-21T09:15:00.000Z",
    actor: "Adaeze Okafor",
    actorRole: "super_admin",
    action: "fee.custom.set",
    target: "Ayo Logistics · Withdrawal",
    detail: "0.5% + ₦25, max ₦1,000 → 0.25% + ₦10, max ₦500",
  },
  {
    id: "seed_04",
    at: "2026-10-19T10:00:00.000Z",
    actor: "Adaeze Okafor",
    actorRole: "super_admin",
    action: "admin.invite",
    target: "Zainab Lawal",
    detail: "zainab@paydesk.example as Viewer",
  },
  {
    id: "seed_03",
    at: "2026-10-18T09:30:00.000Z",
    actor: "Risk team",
    action: "wallet.freeze",
    target: "Owambe Rentals",
    detail: "Identity documents expired",
  },
  {
    id: "seed_02",
    at: "2026-10-18T09:30:00.000Z",
    actor: "Risk team",
    action: "wallet.freeze",
    target: "Sabo Auto Parts",
    detail: "Unusual chargeback pattern under review",
  },
  {
    id: "seed_01",
    at: "2026-09-01T08:30:00.000Z",
    actor: "Adaeze Okafor",
    actorRole: "super_admin",
    action: "admin.deactivate",
    target: "Obinna Chukwu",
  },
];

/** Stored in a cookie with everything else, so only the most recent are kept. */
export const MAX_VISITOR_ENTRIES = 25;

/**
 * Adds an entry to the front of a visitor's log. Called in the same save as
 * the change it describes, so neither can exist without the other.
 */
export function appendAudit(
  log: readonly AuditEntry[],
  actor: Pick<User, "name" | "role">,
  entry: Pick<AuditEntry, "action" | "target" | "detail">,
  at = new Date().toISOString(),
  id = crypto.randomUUID().slice(0, 8),
): AuditEntry[] {
  return [
    { id, at, actor: actor.name, actorRole: actor.role, ...entry },
    ...log,
  ].slice(0, MAX_VISITOR_ENTRIES);
}

/** The visitor's own entries on top of the shared history, newest first. */
export function auditLogFor(visitorEntries: readonly AuditEntry[]): AuditEntry[] {
  return [...visitorEntries, ...seedEntries].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
}

export function categoryOf(action: AuditAction): AuditCategory {
  return auditActions[action].category;
}

export interface AuditFilter {
  category?: AuditCategory;
  actor?: string;
}

export function filterAudit(
  entries: readonly AuditEntry[],
  { category, actor }: AuditFilter,
): AuditEntry[] {
  return entries.filter(
    (entry) =>
      (!category || categoryOf(entry.action) === category) &&
      (!actor || entry.actor === actor),
  );
}

/** Everyone who appears in the log, for the filter. */
export function auditActors(entries: readonly AuditEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.actor))].sort();
}
