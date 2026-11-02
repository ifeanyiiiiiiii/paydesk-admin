"use client";

import { Check, Minus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type Admin,
  type AdminChange,
  checkAdminChange,
  MAX_PENDING_INVITES,
} from "@/lib/admins/admins";
import { initials } from "@/lib/auth/demo-users";
import {
  can,
  permissionLabels,
  permissions,
  roleDetails,
  roles,
} from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { InviteDialog } from "./invite-dialog";
import { RoleDialog } from "./role-dialog";
import { useAdmins, useChangeAdmin, useRevokeInvite } from "./use-admins";

type Confirm =
  | { kind: "deactivate" | "reactivate"; admin: Admin }
  | { kind: "revoke"; admin: Admin };

export function AdminsView({
  initialAdmins,
  currentUserId,
  canManage,
}: {
  initialAdmins: Admin[];
  currentUserId: string;
  canManage: boolean;
}) {
  const { data: admins } = useAdmins(initialAdmins);
  const change = useChangeAdmin();
  const revoke = useRevokeInvite();
  const [inviting, setInviting] = useState(false);
  const [roleFor, setRoleFor] = useState<Admin | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const pending = admins.filter((a) => a.status === "invited").length;
  const atLimit = pending >= MAX_PENDING_INVITES;
  const allowed = (admin: Admin, c: AdminChange) =>
    checkAdminChange(admins, admin, c, currentUserId) === null;

  function runConfirm() {
    if (!confirm) return;
    const { kind, admin } = confirm;
    const done = {
      deactivate: `${admin.name} can no longer sign in`,
      reactivate: `${admin.name} can sign in again`,
      revoke: `Invite to ${admin.email} revoked`,
    }[kind];
    const options = {
      onSuccess: () => toast.success(done),
      onError: (e: Error) => toast.error(e.message),
    };
    if (kind === "revoke") revoke.mutate(admin.id, options);
    else change.mutate({ id: admin.id, change: { action: kind } }, options);
    setConfirm(null);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {admins.filter((a) => a.status === "active").length} active ·{" "}
            {pending} pending invite{pending === 1 ? "" : "s"}
          </p>
          {canManage && (
            <Button
              size="sm"
              disabled={atLimit}
              title={
                atLimit
                  ? `The demo keeps up to ${MAX_PENDING_INVITES} pending invites. Revoke one first.`
                  : undefined
              }
              onClick={() => setInviting(true)}
            >
              <UserPlus />
              Invite admin
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[820px] table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[31%]">Admin</TableHead>
                <TableHead className="w-[14%] text-center">Role</TableHead>
                <TableHead className="w-[14%] text-center">Status</TableHead>
                <TableHead className="w-[20%]">Activity</TableHead>
                {canManage && (
                  <TableHead className="w-[21%] text-right">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isYou = admin.id === currentUserId;
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {initials(admin.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium">
                            {admin.name}
                            {isYou && <Badge variant="secondary">You</Badge>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {admin.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {roleDetails[admin.role].label}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={admin.status} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Activity admin={admin} />
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {isYou ? (
                            <span
                              className="text-xs text-muted-foreground"
                              title="Only another super admin can change your account"
                            >
                              Your account
                            </span>
                          ) : admin.status === "invited" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setConfirm({ kind: "revoke", admin })
                              }
                            >
                              Revoke invite
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRoleFor(admin)}
                              >
                                Change role
                              </Button>
                              {admin.status === "active" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    !allowed(admin, { action: "deactivate" })
                                  }
                                  title={
                                    allowed(admin, { action: "deactivate" })
                                      ? undefined
                                      : "PayDesk needs at least one active super admin"
                                  }
                                  onClick={() =>
                                    setConfirm({ kind: "deactivate", admin })
                                  }
                                >
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setConfirm({ kind: "reactivate", admin })
                                  }
                                >
                                  Reactivate
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <RolesMatrix />

      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
      {roleFor && (
        <RoleDialog
          key={roleFor.id}
          admin={roleFor}
          admins={admins}
          currentUserId={currentUserId}
          onClose={() => setRoleFor(null)}
        />
      )}

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          {confirm && <ConfirmText confirm={confirm} />}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.kind === "reactivate" ? "default" : "destructive"}
              onClick={runConfirm}
            >
              {confirm &&
                {
                  deactivate: "Deactivate",
                  reactivate: "Reactivate",
                  revoke: "Revoke invite",
                }[confirm.kind]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConfirmText({ confirm: { kind, admin } }: { confirm: Confirm }) {
  const text = {
    deactivate: {
      title: `Deactivate ${admin.name}?`,
      body: "They'll be signed out straight away and can't sign in until reactivated. Nothing they did is deleted.",
    },
    reactivate: {
      title: `Reactivate ${admin.name}?`,
      body: `They'll be able to sign in again as ${roleDetails[admin.role].label}.`,
    },
    revoke: {
      title: `Revoke the invite to ${admin.email}?`,
      body: "The invite link stops working. You can invite them again later.",
    },
  }[kind];
  return (
    <AlertDialogHeader>
      <AlertDialogTitle>{text.title}</AlertDialogTitle>
      <AlertDialogDescription>{text.body}</AlertDialogDescription>
    </AlertDialogHeader>
  );
}

function StatusBadge({ status }: { status: Admin["status"] }) {
  const styles = {
    active:
      "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    invited:
      "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    deactivated: "border-border bg-muted text-muted-foreground",
  };
  const labels = {
    active: "Active",
    invited: "Invited",
    deactivated: "Deactivated",
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {labels[status]}
    </Badge>
  );
}

function Activity({ admin }: { admin: Admin }) {
  const [label, at] =
    admin.status === "invited"
      ? [`Invited by ${admin.changedBy}`, admin.addedAt]
      : admin.status === "deactivated"
        ? [`Deactivated by ${admin.changedBy}`, admin.changedAt]
        : admin.changedBy
          ? [`Changed by ${admin.changedBy}`, admin.changedAt]
          : ["Last active", admin.lastActiveAt];
  return (
    <>
      {label}
      {at && (
        <span className="block text-xs text-muted-foreground">
          {formatDateTime(at)}
        </span>
      )}
    </>
  );
}

/** What each role can do, generated from the same map the server checks. */
function RolesMatrix() {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-medium">What each role can do</h3>
        <p className="text-sm text-muted-foreground">
          Built from the permission checks the server runs, so it can&apos;t go
          out of date.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table className="min-w-[560px] table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[46%]">Permission</TableHead>
              {roles.map((role) => (
                <TableHead key={role} className="w-[18%] text-center">
                  {roleDetails[role].label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission}>
                <TableCell>{permissionLabels[permission]}</TableCell>
                {roles.map((role) => (
                  <TableCell key={role} className="text-center">
                    {can(role, permission) ? (
                      <Check
                        aria-label="Allowed"
                        className="mx-auto size-4 text-emerald-600 dark:text-emerald-400"
                      />
                    ) : (
                      <Minus
                        aria-label="Not allowed"
                        className="mx-auto size-4 text-muted-foreground"
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
