import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOptionalUser } from "@/lib/auth/dal";
import { DemoAccountList } from "./demo-account-list";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="size-5" />
          </div>
          <span className="text-xl font-semibold">PayDesk Admin</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to the demo</CardTitle>
            <CardDescription>
              PayDesk is a fictional payments platform. Pick an account to
              explore the dashboard with that role&apos;s permissions. No
              password needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Depends on the session and ?from=, so it renders at request time */}
            <Suspense>
              <AccountsOrRedirect />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

async function AccountsOrRedirect() {
  // Already signed in with a valid session: skip the login page
  if (await getOptionalUser()) redirect("/overview");
  return <DemoAccountList />;
}
