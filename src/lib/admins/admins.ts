import { z } from "zod";
import { demoUsers } from "@/lib/auth/demo-users";
import { type Role, roles } from "@/lib/auth/permissions";

/**
 * Admin accounts: who can use PayDesk and with which role. Pure (no cookies,
 * no server APIs), so the rules that stop anyone locking the team out are
 * tested directly and shared with the UI.
 */

export const adminStatuses = ["active", "invited", "deactivated"] as const;
export type AdminStatus = (typeof adminStatuses)[number];

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AdminStatus;
  /** ISO 8601. For an invite, when it was sent. */
  addedAt: string;
  lastActiveAt?: string;
  /** Who last changed the account and when, if anyone has. */
  changedBy?: string;
  changedAt?: string;
  /** One of the demo accounts on the login page. */
  canSignIn: boolean;
}

/** Everyone uses a company address, so a personal email can't be invited. */
export const COMPANY_DOMAIN = "paydesk.example";
/** Pending invites are stored in a cookie, so there's a limit. */
export const MAX_PENDING_INVITES = 5;

const lastActive: Record<string, string> = {
  usr_adaeze: "2026-10-20T16:42:00.000Z",
  usr_tunde: "2026-10-20T15:10:00.000Z",
  usr_ngozi: "2026-10-19T11:05:00.000Z",
};

/** The demo accounts plus a few more, so the page looks like a real team. All fictional. */
const seedAdmins: Admin[] = [
  ...demoUsers.map(
    (user): Admin => ({
      ...user,
      status: "active",
      addedAt: "2025-03-03T09:00:00.000Z",
      lastActiveAt: lastActive[user.id],
      canSignIn: true,
    }),
  ),
  {
    id: "usr_ifeoma",
    name: "Ifeoma Nwosu",
    email: "ifeoma@paydesk.example",
    role: "operations",
    status: "active",
    addedAt: "2025-06-16T09:00:00.000Z",
    lastActiveAt: "2026-10-20T13:22:00.000Z",
    canSignIn: false,
  },
  {
    id: "usr_musa",
    name: "Musa Abubakar",
    email: "musa@paydesk.example",
    role: "operations",
    status: "active",
    addedAt: "2025-09-01T09:00:00.000Z",
    lastActiveAt: "2026-10-18T09:47:00.000Z",
    canSignIn: false,
  },
  {
    id: "usr_kemi",
    name: "Kemi Adeyemi",
    email: "kemi@paydesk.example",
    role: "viewer",
    status: "active",
    addedAt: "2026-01-12T09:00:00.000Z",
    lastActiveAt: "2026-10-14T14:30:00.000Z",
    canSignIn: false,
  },
  {
    id: "usr_obinna",
    name: "Obinna Chukwu",
    email: "obinna@paydesk.example",
    role: "operations",
    status: "deactivated",
    addedAt: "2025-04-07T09:00:00.000Z",
    lastActiveAt: "2026-08-29T17:05:00.000Z",
    changedBy: "Adaeze Okafor",
    changedAt: "2026-09-01T08:30:00.000Z",
    canSignIn: false,
  },
  {
    id: "usr_zainab",
    name: "Zainab Lawal",
    email: "zainab@paydesk.example",
    role: "viewer",
    status: "invited",
    addedAt: "2026-10-19T10:00:00.000Z",
    changedBy: "Adaeze Okafor",
    changedAt: "2026-10-19T10:00:00.000Z",
    canSignIn: false,
  },
];

/** A visitor's own changes on top of the shared admin list. */
export interface AdminOverrides {
  /** Role or status changes to existing accounts, by id. */
  changed: Record<
    string,
    { role: Role; status: AdminStatus; by: string; at: string }
  >;
  /** Invites this visitor sent. */
  invited: (Pick<Admin, "id" | "name" | "email" | "role" | "addedAt"> & {
    by: string;
  })[];
  /** Invites from the seed data that were revoked. */
  revoked: string[];
}

export const emptyAdminOverrides = (): AdminOverrides => ({
  changed: {},
  invited: [],
  revoked: [],
});

export function applyAdminOverrides(overrides: AdminOverrides): Admin[] {
  const invited = overrides.invited.map(
    ({ by, ...invite }): Admin => ({
      ...invite,
      status: "invited",
      changedBy: by,
      changedAt: invite.addedAt,
      canSignIn: false,
    }),
  );
  return [...seedAdmins, ...invited]
    .filter((admin) => !overrides.revoked.includes(admin.id))
    .map((admin) => {
      const change = overrides.changed[admin.id];
      return change
        ? {
            ...admin,
            role: change.role,
            status: change.status,
            changedBy: change.by,
            changedAt: change.at,
          }
        : admin;
    });
}

export const adminChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("change_role"), role: z.enum(roles) }),
  z.object({ action: z.literal("deactivate") }),
  z.object({ action: z.literal("reactivate") }),
]);
export type AdminChange = z.infer<typeof adminChangeSchema>;

export type AdminError =
  | "self"
  | "last_super_admin"
  | "same_role"
  | "already_deactivated"
  | "not_deactivated"
  | "invite_pending";

function isActiveSuperAdmin(admin: Admin): boolean {
  return admin.role === "super_admin" && admin.status === "active";
}

/**
 * The rules for changing an account. The server runs these before saving,
 * and the page uses them to hide actions that would be refused.
 */
export function checkAdminChange(
  admins: readonly Admin[],
  target: Admin,
  change: AdminChange,
  actorId: string,
): AdminError | null {
  // Changing your own role or access is how admins lock themselves out
  if (target.id === actorId) return "self";

  const removesSuperAdmin =
    isActiveSuperAdmin(target) &&
    (change.action === "deactivate" ||
      (change.action === "change_role" && change.role !== "super_admin"));
  if (
    removesSuperAdmin &&
    admins.filter(isActiveSuperAdmin).length <= 1
  ) {
    return "last_super_admin";
  }

  switch (change.action) {
    case "change_role":
      return change.role === target.role ? "same_role" : null;
    case "deactivate":
      if (target.status === "invited") return "invite_pending";
      return target.status === "deactivated" ? "already_deactivated" : null;
    case "reactivate":
      return target.status === "deactivated" ? null : "not_deactivated";
  }
}

export const adminErrorMessages: Record<AdminError, string> = {
  self: "You can't change your own role or access. Ask another super admin.",
  last_super_admin:
    "PayDesk needs at least one active super admin. Make someone else a super admin first.",
  same_role: "They already have this role",
  already_deactivated: "This account is already deactivated",
  not_deactivated: "This account isn't deactivated",
  invite_pending: "This invite hasn't been accepted yet. Revoke it instead.",
};

/** The account as it will be after a change that passed checkAdminChange. */
export function applyAdminChange(admin: Admin, change: AdminChange): Admin {
  switch (change.action) {
    case "change_role":
      return { ...admin, role: change.role };
    case "deactivate":
      return { ...admin, status: "deactivated" };
    case "reactivate":
      return { ...admin, status: "active" };
  }
}

export const inviteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter their full name")
    .max(60, "Keep the name under 60 characters"),
  // Tidied first, so a pasted address with spaces or capitals still works
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address"))
    .refine((email) => email.endsWith(`@${COMPANY_DOMAIN}`), {
      message: `Use a company address ending in @${COMPANY_DOMAIN}`,
    }),
  role: z.enum(roles, { error: "Choose a role" }),
});
export type InviteForm = z.input<typeof inviteSchema>;
export type Invite = z.output<typeof inviteSchema>;

export type InviteError = "email_taken" | "too_many_invites";

export function checkInvite(
  admins: readonly Admin[],
  invite: Invite,
): InviteError | null {
  if (admins.some((admin) => admin.email === invite.email)) {
    return "email_taken";
  }
  const pending = admins.filter((admin) => admin.status === "invited").length;
  return pending >= MAX_PENDING_INVITES ? "too_many_invites" : null;
}

export const inviteErrorMessages: Record<InviteError, string> = {
  email_taken: "Someone with this email already has an account or an invite",
  too_many_invites: `The demo keeps up to ${MAX_PENDING_INVITES} pending invites. Revoke one first.`,
};
