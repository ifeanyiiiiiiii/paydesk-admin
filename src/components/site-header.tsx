"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { findNavItem } from "@/config/navigation";

/** `account` is the user menu, passed in so it can stream in from the server. */
export function SiteHeader({ account }: { account: React.ReactNode }) {
  const title = findNavItem(usePathname())?.title ?? "PayDesk";

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-center"
      />
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        {account}
      </div>
    </header>
  );
}
