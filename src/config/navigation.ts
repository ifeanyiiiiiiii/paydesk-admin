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

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { title: "Overview", href: "/overview", icon: LayoutDashboard },
      { title: "Transactions", href: "/transactions", icon: ArrowLeftRight },
      { title: "Businesses", href: "/businesses", icon: Building2 },
      { title: "Wallets", href: "/wallets", icon: Wallet },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Fees", href: "/fees", icon: Percent },
      { title: "Admin users", href: "/admins", icon: ShieldCheck },
      { title: "Audit log", href: "/audit-log", icon: ScrollText },
    ],
  },
];

/** Finds the nav item for a path, including nested pages like /transactions/123. */
export function findNavItem(pathname: string): NavItem | undefined {
  return navigation
    .flatMap((group) => group.items)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
}
