"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COMPANY_DOMAIN,
  type Invite,
  type InviteForm,
  inviteSchema,
} from "@/lib/admins/admins";
import { roleDetails } from "@/lib/auth/permissions";
import { RoleSelect } from "./role-select";
import { useInviteAdmin } from "./use-admins";

/** Validated with the same schema as the API, so the rules can't drift apart. */
export function InviteDialog({ onClose }: { onClose: () => void }) {
  const invite = useInviteAdmin();
  const form = useForm<InviteForm, unknown, Invite>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "" },
  });
  const { errors } = form.formState;

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !invite.isPending && onClose()}
    >
      <DialogContent>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            invite.mutate(values, {
              onSuccess: () => {
                toast.success(`Invite sent to ${values.email}`);
                onClose();
              },
              onError: (e) => toast.error(e.message),
            }),
          )}
        >
          <DialogHeader>
            <DialogTitle>Invite an admin</DialogTitle>
            <DialogDescription>
              They&apos;ll get access with the role you choose once they accept.
              Demo: no email is actually sent.
            </DialogDescription>
          </DialogHeader>

          <Field id="invite-name" label="Full name" error={errors.name?.message}>
            <Input
              id="invite-name"
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
              {...form.register("name")}
            />
          </Field>

          <Field
            id="invite-email"
            label="Work email"
            error={errors.email?.message}
          >
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              placeholder={`name@${COMPANY_DOMAIN}`}
              aria-invalid={Boolean(errors.email)}
              {...form.register("email")}
            />
          </Field>

          <Field id="invite-role" label="Role" error={errors.role?.message}>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <>
                  <RoleSelect
                    id="invite-role"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={Boolean(errors.role)}
                  />
                  {field.value && (
                    <p className="text-xs text-muted-foreground">
                      {roleDetails[field.value].description}
                    </p>
                  )}
                </>
              )}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={invite.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending && <Loader2 className="animate-spin" />}
              {invite.isPending ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
