import type { NextRequest } from "next/server";
import {
  adminChangeSchema,
  adminErrorMessages,
} from "@/lib/admins/admins";
import {
  type AdminResult,
  changeAdmin,
  revokeInvite,
} from "@/lib/admins/service";
import { authorizeApi } from "@/lib/auth/api";
import { SandboxFullError } from "@/lib/sandbox/fit";

const failures: Record<string, { status: number; error: string }> = {
  not_found: { status: 404, error: "Admin not found" },
  not_invited: { status: 409, error: "Only pending invites can be revoked" },
  self: { status: 403, error: adminErrorMessages.self },
  last_super_admin: { status: 409, error: adminErrorMessages.last_super_admin },
  same_role: { status: 409, error: adminErrorMessages.same_role },
  already_deactivated: {
    status: 409,
    error: adminErrorMessages.already_deactivated,
  },
  not_deactivated: { status: 409, error: adminErrorMessages.not_deactivated },
  invite_pending: { status: 409, error: adminErrorMessages.invite_pending },
};

async function respond(action: () => Promise<AdminResult>) {
  try {
    const result = await action();
    if (result.ok) return Response.json(result.admins);
    const { status, error } = failures[result.error];
    return Response.json({ error }, { status });
  } catch (error) {
    if (error instanceof SandboxFullError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

/**
 * PATCH /api/admins/:id
 * Body: { action: "change_role", role } | { action: "deactivate" } | { action: "reactivate" }
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admins/[id]">,
) {
  const auth = await authorizeApi("admins:manage");
  if (auth.error) return auth.error;

  const body = adminChangeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return Response.json(
      { error: "Invalid request", issues: body.error.issues },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  return respond(() => changeAdmin(id, body.data, auth.user));
}

/** DELETE /api/admins/:id: revokes a pending invite. */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/admins/[id]">,
) {
  const auth = await authorizeApi("admins:manage");
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  return respond(() => revokeInvite(id, auth.user));
}
