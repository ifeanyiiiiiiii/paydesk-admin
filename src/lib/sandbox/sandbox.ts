import "server-only";
import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { sessionPassword } from "@/lib/auth/session";
import type { WalletOverride } from "@/lib/wallets/wallets";

/**
 * Each visitor's changes to the demo (frozen wallets, withdrawals, ...) live
 * in their own encrypted cookie instead of shared server memory. So one
 * visitor freezing a wallet never affects anyone else, changes survive a
 * reload, and it works on serverless hosting where memory isn't shared
 * between requests. Signing out keeps the sandbox; it expires with inactivity.
 */

const SANDBOX_COOKIE = "paydesk_sandbox";
const SANDBOX_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface Sandbox {
  wallets: Record<string, WalletOverride>;
}

const empty = (): Sandbox => ({ wallets: {} });

export async function getSandbox(): Promise<Sandbox> {
  const sealed = (await cookies()).get(SANDBOX_COOKIE)?.value;
  if (!sealed) return empty();
  await connection(); // unsealing checks expiry against the current time
  try {
    const data = await unsealData<Partial<Sandbox>>(sealed, {
      password: sessionPassword(),
      ttl: SANDBOX_TTL_SECONDS,
    });
    return { ...empty(), ...data };
  } catch {
    return empty();
  }
}

/** Only callable from a Server Action or Route Handler, where cookies can be set. */
export async function saveSandbox(sandbox: Sandbox): Promise<void> {
  const sealed = await sealData(sandbox, {
    password: sessionPassword(),
    ttl: SANDBOX_TTL_SECONDS,
  });
  (await cookies()).set(SANDBOX_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SANDBOX_TTL_SECONDS,
  });
}
