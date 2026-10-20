"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { findNavItem, navigationFor } from "@/config/navigation";
import type { Role } from "@/lib/auth/permissions";

/** `role` is null while the session is loading; the menu shows placeholders. */
export function AppSidebar({ role }: { role: Role | null }) {
  const pathname = usePathname();
  const active = findNavItem(pathname);
  const { isMobile, setOpenMobile } = useSidebar();

  // On phones the sidebar is an overlay, so close it once a link is tapped
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/overview" onClick={closeOnMobile} />}
              tooltip="PayDesk Admin"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CreditCard className="size-4" />
              </div>
              <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-semibold">PayDesk</span>
                <span className="text-xs text-muted-foreground">Admin console</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {role === null ? (
          <SidebarGroup>
            <SidebarMenu>
              {["60%", "80%", "70%", "55%", "75%"].map((width, i) => (
                <SidebarMenuItem key={i}>
                  <SidebarMenuSkeleton showIcon width={width} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ) : (
          navigationFor(role).map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} onClick={closeOnMobile} />}
                        isActive={item.href === active?.href}
                        tooltip={item.title}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
