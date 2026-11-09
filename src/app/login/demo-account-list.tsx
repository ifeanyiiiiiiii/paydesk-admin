"use client";

import { ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials, type User } from "@/lib/auth/demo-users";
import { roleDetails } from "@/lib/auth/permissions";

/** A demo account as this visitor has left it: role changes and all. */
export interface DemoAccount {
  user: User;
  active: boolean;
}

export function DemoAccountList({ accounts }: { accounts: DemoAccount[] }) {
  // Where to go after signing in, e.g. /login?from=/fees. The server checks
  // it's a same-site path before redirecting.
  const from = useSearchParams().get("from") ?? "";
  const [signingIn, setSigningIn] = useState<string | null>(null);

  return (
    <ul className="space-y-2">
      {accounts.map(({ user, active }) => (
        <li key={user.id}>
          {/* A plain form post, so the browser loads the dashboard in full */}
          <form
            method="post"
            action="/auth/sign-in"
            onSubmit={() => setSigningIn(user.id)}
          >
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="from" value={from} />
            <AccountButton
              user={user}
              active={active}
              pending={signingIn === user.id}
              disabled={signingIn !== null}
            />
          </form>
        </li>
      ))}
    </ul>
  );
}

function AccountButton({
  user,
  active,
  pending,
  disabled,
}: {
  user: User;
  active: boolean;
  pending: boolean;
  disabled: boolean;
}) {
  const role = roleDetails[user.role];

  return (
    <button
      type="submit"
      disabled={disabled || !active}
      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
    >
      <Avatar className="size-10">
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      <span className="flex-1 space-y-0.5">
        <span className="flex items-center gap-2">
          <span className="font-medium">{user.name}</span>
          <Badge variant="secondary">{role.label}</Badge>
        </span>
        <span className="block text-xs text-muted-foreground">
          {!active
            ? "Deactivated in your demo. A super admin can reactivate this account."
            : pending
              ? "Signing in…"
              : role.description}
        </span>
      </span>
      {active && <ChevronRight className="size-4 text-muted-foreground" />}
    </button>
  );
}
