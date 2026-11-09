"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Asks before signing out, so a stray click doesn't end the session. */
export function SignOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isSigningOut, setSigningOut] = useState(false);

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
        {/*
          A plain form post: the browser then loads /login in full, which
          clears every page and cached response this session left in memory,
          so the next person on a shared computer can't find them.
        */}
        <form
          method="post"
          action="/auth/sign-out"
          onSubmit={() => setSigningOut(true)}
        >
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>Cancel</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={isSigningOut}>
              {isSigningOut ? "Signing out…" : "Sign out"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
