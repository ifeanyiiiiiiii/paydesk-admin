"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { SignOutDialog } from "@/components/sign-out-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { initials, type User } from "@/lib/auth/demo-users";
import { roleDetails } from "@/lib/auth/permissions";

/** Who's signed in, plus a Sign out button that's always visible. */
export function SidebarAccount({ user }: { user: User }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:hidden">
          <Avatar className="size-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 leading-tight">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {roleDetails[user.role].label}
            </span>
          </div>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Sign out"
            onClick={() => setConfirming(true)}
          >
            <LogOut />
            <span>Sign out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <SignOutDialog open={confirming} onOpenChange={setConfirming} />
    </>
  );
}
