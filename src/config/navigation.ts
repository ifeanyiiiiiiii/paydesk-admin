import {
  ArrowLeftRight,
  Building2,
  LayoutDashboard,
  type LucideIcon,
  Percent,
  ScrollText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { can, type Permission, type Role } from "@/lib/auth/permissions";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Permission needed to see this item and open its page. */
  permission: Permission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { title: "Overview", href: "/overview", icon: LayoutDashboard, permission: "overview:view" },
      { title: "Transactions", href: "/transactions", icon: ArrowLeftRight, permission: "transactions:view" },
      { title: "Businesses", href: "/businesses", icon: Building2, permission: "businesses:view" },
      { title: "Wallets", href: "/wallets", icon: Wallet, permission: "wallets:view" },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Fees", href: "/fees", icon: Percent, permission: "fees:view" },
      { title: "Admin users", href: "/admins", icon: ShieldCheck, permission: "admins:view" },
      { title: "Audit log", href: "/audit-log", icon: ScrollText, permission: "audit:view" },
    ],
  },
];

/** The navigation a role is allowed to see, without empty groups. */
export function navigationFor(role: Role): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(role, item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Finds the nav item for a path, including nested pages like /transactions/123. */
export function findNavItem(pathname: string): NavItem | undefined {
  return navigation
    .flatMap((group) => group.items)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
}
