import "server-only";
import type { User } from "@/lib/auth/demo-users";
import { getSandbox, saveSandbox } from "@/lib/sandbox/sandbox";
import {
  type Admin,
  type AdminChange,
  type AdminError,
  applyAdminChange,
  applyAdminOverrides,
  checkAdminChange,
  checkInvite,
  type Invite,
  type InviteError,
} from "./admins";

/** The admin list as this visitor sees it. */
export async function getAdmins(): Promise<Admin[]> {
  return applyAdminOverrides((await getSandbox()).admins);
}

export type AdminResult =
  | { ok: true; admins: Admin[] }
  | { ok: false; error: AdminError | InviteError | "not_found" | "not_invited" };

/**
 * Changes an account's role or access. Callers must check admins:manage
 * first; the lockout rules are checked here, with the actor's own id.
 */
export async function changeAdmin(
  id: string,
  change: AdminChange,
  actor: User,
): Promise<AdminResult> {
  const sandbox = await getSandbox();
  const admins = applyAdminOverrides(sandbox.admins);
  const target = admins.find((admin) => admin.id === id);
  if (!target) return { ok: false, error: "not_found" };

  const error = checkAdminChange(admins, target, change, actor.id);
  if (error) return { ok: false, error };

  const { role, status } = applyAdminChange(target, change);
  sandbox.admins.changed[id] = {
    role,
    status,
    by: actor.name,
    at: new Date().toISOString(),
  };
  await saveSandbox(sandbox);
  return { ok: true, admins: applyAdminOverrides(sandbox.admins) };
}

/** Sends an invite. Callers must check admins:manage first. */
export async function inviteAdmin(
  invite: Invite,
  actor: User,
): Promise<AdminResult> {
  const sandbox = await getSandbox();
  const error = checkInvite(applyAdminOverrides(sandbox.admins), invite);
  if (error) return { ok: false, error };

  sandbox.admins.invited.push({
    ...invite,
    id: `usr_${crypto.randomUUID().slice(0, 8)}`,
    addedAt: new Date().toISOString(),
    by: actor.name,
  });
  await saveSandbox(sandbox);
  return { ok: true, admins: applyAdminOverrides(sandbox.admins) };
}

/** Cancels an invite that hasn't been accepted. Callers must check admins:manage. */
export async function revokeInvite(id: string): Promise<AdminResult> {
  const sandbox = await getSandbox();
  const target = applyAdminOverrides(sandbox.admins).find((a) => a.id === id);
  if (!target) return { ok: false, error: "not_found" };
  if (target.status !== "invited") return { ok: false, error: "not_invited" };

  const sent = sandbox.admins.invited.some((invite) => invite.id === id);
  if (sent) {
    sandbox.admins.invited = sandbox.admins.invited.filter((i) => i.id !== id);
  } else {
    sandbox.admins.revoked.push(id);
  }
  delete sandbox.admins.changed[id];
  await saveSandbox(sandbox);
  return { ok: true, admins: applyAdminOverrides(sandbox.admins) };
}
