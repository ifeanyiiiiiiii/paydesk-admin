"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { SignOutDialog } from "@/components/sign-out-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials, type User } from "@/lib/auth/demo-users";
import { roleDetails } from "@/lib/auth/permissions";

export function UserMenu({ user }: { user: User }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label={`Account menu for ${user.name}`}
            />
          }
        >
          <Avatar className="size-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-1 font-normal">
              <span className="font-medium text-foreground">{user.name}</span>
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
              <Badge variant="secondary" className="mt-1 w-fit">
                {roleDetails[user.role].label}
              </Badge>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfirming(true)}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SignOutDialog open={confirming} onOpenChange={setConfirming} />
    </>
  );
}
