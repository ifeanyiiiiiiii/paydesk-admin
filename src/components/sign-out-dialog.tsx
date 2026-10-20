"use client";

import { useTransition } from "react";
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
import { signOut } from "@/lib/auth/actions";

/** Asks before signing out, so a stray click doesn't end the session. */
export function SignOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isSigningOut, startTransition] = useTransition();

  return (
    <AlertDialog
      open={open}
      // Keep the dialog open while the sign-out request is in flight
      onOpenChange={(next) => !isSigningOut && onOpenChange(next)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out of PayDesk?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll need to pick an account again to get back in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSigningOut}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isSigningOut}
            onClick={() => startTransition(() => signOut())}
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
