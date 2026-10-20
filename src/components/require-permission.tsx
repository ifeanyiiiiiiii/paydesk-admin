import { Lock } from "lucide-react";
import { Suspense } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, getUserWithPermission } from "@/lib/auth/dal";
import { type Permission, roleDetails } from "@/lib/auth/permissions";

/**
 * Renders `children` only if the signed-in user has `permission`. Checked on
 * the server, so a hidden sidebar link isn't the only thing keeping people out.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
      <PermissionGate permission={permission}>{children}</PermissionGate>
    </Suspense>
  );
}

async function PermissionGate({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  if (await getUserWithPermission(permission)) return children;

  const { role } = await getCurrentUser();
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <Lock className="mx-auto mb-2 size-8 text-muted-foreground" />
        <CardTitle>You don&apos;t have access to this page</CardTitle>
        <CardDescription className="mx-auto max-w-md">
          Your role ({roleDetails[role].label}) can&apos;t open this section.
          Ask a super admin if you need access.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
