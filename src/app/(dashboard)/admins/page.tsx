import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminsView } from "@/components/admins/admins-view";
import { RequirePermission } from "@/components/require-permission";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdmins } from "@/lib/admins/service";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Admin users" };

export default function AdminsPage() {
  return (
    <RequirePermission permission="admins:view">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Admin users</h2>
          <p className="text-sm text-muted-foreground">
            Who can use PayDesk and what each person can do. Changes take effect
            on their next click.
          </p>
        </div>
        <Suspense fallback={<AdminsSkeleton />}>
          <AdminsContent />
        </Suspense>
        <p className="text-xs text-muted-foreground">
          Demo note: changes are saved for your browser only. Change a demo
          account&apos;s role here, then sign in as them to see it take effect.
        </p>
      </div>
    </RequirePermission>
  );
}

async function AdminsContent() {
  const [user, admins] = await Promise.all([getCurrentUser(), getAdmins()]);
  return (
    <AdminsView
      initialAdmins={admins}
      currentUserId={user.id}
      canManage={can(user.role, "admins:manage")}
    />
  );
}

function AdminsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
