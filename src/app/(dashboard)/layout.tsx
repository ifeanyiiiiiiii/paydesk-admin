import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth/dal";

// The layout itself is static, so it's served instantly. Only the parts that
// depend on who's signed in wait for the session, behind Suspense boundaries.
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <Suspense fallback={<AppSidebar user={null} />}>
        <SidebarForCurrentUser />
      </Suspense>
      <SidebarInset>
        <SiteHeader
          account={
            <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
              <UserMenuForCurrentUser />
            </Suspense>
          }
        />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

async function SidebarForCurrentUser() {
  const user = await getCurrentUser();
  return <AppSidebar user={user} />;
}

async function UserMenuForCurrentUser() {
  const user = await getCurrentUser();
  return <UserMenu user={user} />;
}
