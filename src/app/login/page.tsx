import {
  CreditCard,
  ScrollText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAdmins } from "@/lib/admins/service";
import { getOptionalUser } from "@/lib/auth/dal";
import { demoUsers } from "@/lib/auth/demo-users";
import { DemoAccountList } from "./demo-account-list";

export const metadata: Metadata = { title: "Sign in" };

const highlights = [
  { icon: Wallet, text: "Wallets, withdrawals and fees, with money kept exact to the kobo" },
  { icon: ShieldCheck, text: "Three roles, each seeing only what it's allowed to" },
  { icon: ScrollText, text: "An audit log of every change and export" },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-svh bg-muted/40 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:px-10 lg:flex lg:flex-col lg:justify-between lg:py-12">
        {/* Soft shapes for depth; purely decorative */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-white/5"
        />

        <div className="relative flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/20">
            <CreditCard className="size-5" aria-hidden />
          </div>
          <span className="text-lg font-semibold">PayDesk Admin</span>
        </div>

        <div className="relative mt-6 max-w-md lg:mt-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            The operations console for a payments platform
          </h1>
          <ul className="mt-6 hidden space-y-3 text-sm text-white/90 lg:block">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-white/15">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-4 hidden text-xs text-white/75 lg:block">
          An open-source demo. Every business, person and amount is fictional.
        </p>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Sign in to the demo</h2>
            <p className="text-sm text-muted-foreground">
              Pick an account to explore with that role&apos;s permissions. No
              password needed.
            </p>
          </div>
          {/* Depends on the session and ?from=, so it renders at request time */}
          <Suspense>
            <AccountsOrRedirect />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function AccountsOrRedirect() {
  // Already signed in with a valid session: skip the login page
  if (await getOptionalUser()) redirect("/overview");

  // Shown as this visitor left them, so a role change or deactivation is visible here
  const admins = await getAdmins();
  const accounts = demoUsers.map((user) => {
    const admin = admins.find((a) => a.id === user.id);
    return {
      user: { ...user, role: admin?.role ?? user.role },
      active: admin?.status === "active",
    };
  });
  return <DemoAccountList accounts={accounts} />;
}
