"use client";

import { Check, Loader2, Minus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  type Admin,
  adminErrorMessages,
  checkAdminChange,
} from "@/lib/admins/admins";
import {
  permissionLabels,
  type Role,
  roleChange,
  roleDetails,
} from "@/lib/auth/permissions";
import { RoleSelect } from "./role-select";
import { useChangeAdmin } from "./use-admins";

/**
 * Changes someone's role, spelling out exactly what they gain and lose first,
 * because a role is easier to pick than its consequences are to see.
 */
export function RoleDialog({
  admin,
  admins,
  currentUserId,
  onClose,
}: {
  admin: Admin;
  admins: Admin[];
  currentUserId: string;
  onClose: () => void;
}) {
  const [role, setRole] = useState<Role>(admin.role);
  const change = useChangeAdmin();
  const { gains, loses } = roleChange(admin.role, role);
  const error =
    role === admin.role
      ? null
      : checkAdminChange(
          admins,
          admin,
          { action: "change_role", role },
          currentUserId,
        );

  function save() {
    change.mutate(
      { id: admin.id, change: { action: "change_role", role } },
      {
        onSuccess: () => {
          toast.success(`${admin.name} is now ${roleDetails[role].label}`);
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !change.isPending && onClose()}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change {admin.name}&apos;s role</DialogTitle>
          <DialogDescription>
            Currently {roleDetails[admin.role].label}.{" "}
            {admin.status === "active" &&
              "It takes effect on their next click, with no need to sign in again."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="role-change">New role</Label>
          <RoleSelect id="role-change" value={role} onChange={setRole} />
          <p className="text-xs text-muted-foreground">
            {roleDetails[role].description}
          </p>
        </div>

        {(gains.length > 0 || loses.length > 0) && (
          <div className="space-y-3 rounded-lg bg-muted/60 p-3 text-sm">
            {gains.length > 0 && (
              <ChangeList
                title="They'll be able to"
                items={gains.map((p) => permissionLabels[p])}
                tone="gain"
              />
            )}
            {loses.length > 0 && (
              <ChangeList
                title="They'll no longer be able to"
                items={loses.map((p) => permissionLabels[p])}
                tone="loss"
              />
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{adminErrorMessages[error]}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={change.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={change.isPending || role === admin.role || error !== null}
            onClick={save}
          >
            {change.isPending && <Loader2 className="animate-spin" />}
            {change.isPending ? "Saving…" : "Change role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "gain" | "loss";
}) {
  const Icon = tone === "gain" ? Check : Minus;
  return (
    <div>
      <p className="mb-1 font-medium">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Icon
              aria-hidden
              className={
                tone === "gain"
                  ? "size-3.5 text-emerald-600 dark:text-emerald-400"
                  : "size-3.5 text-red-600 dark:text-red-400"
              }
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
