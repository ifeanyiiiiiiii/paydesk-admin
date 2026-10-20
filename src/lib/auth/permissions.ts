/**
 * Role-based access control.
 *
 * Every check in the app asks "does this role have this permission?" rather
 * than "is this user a super admin?", so changing what a role can do means
 * editing this one map. Pure and framework-free, so it's safe to use on the
 * server and the client and easy to test.
 */

export const roles = ["super_admin", "operations", "viewer"] as const;
export type Role = (typeof roles)[number];

export type Permission =
  | "overview:view"
  | "transactions:view"
  | "transactions:export"
  | "businesses:view"
  | "wallets:view"
  | "wallets:freeze"
  | "wallets:withdraw"
  | "fees:view"
  | "fees:manage"
  | "admins:view"
  | "admins:manage"
  | "audit:view";

const viewer: Permission[] = [
  "overview:view",
  "transactions:view",
  "businesses:view",
  "wallets:view",
];

const operations: Permission[] = [
  ...viewer,
  "transactions:export",
  "wallets:freeze",
  "wallets:withdraw",
  "fees:view",
  "audit:view",
];

const superAdmin: Permission[] = [
  ...operations,
  "fees:manage",
  "admins:view",
  "admins:manage",
];

const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  super_admin: new Set(superAdmin),
  operations: new Set(operations),
  viewer: new Set(viewer),
};

export const roleDetails: Record<Role, { label: string; description: string }> = {
  super_admin: {
    label: "Super admin",
    description: "Full access, including fee rules and admin accounts.",
  },
  operations: {
    label: "Operations",
    description: "Runs day-to-day operations: wallets, withdrawals and exports.",
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to transactions, businesses and wallets.",
  },
};

export function can(role: Role, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}
