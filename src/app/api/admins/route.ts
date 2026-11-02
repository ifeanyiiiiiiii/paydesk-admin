import type { NextRequest } from "next/server";
import { inviteErrorMessages, inviteSchema } from "@/lib/admins/admins";
import { getAdmins, inviteAdmin } from "@/lib/admins/service";
import { authorizeApi } from "@/lib/auth/api";
import { SandboxFullError } from "@/lib/sandbox/fit";

/** GET /api/admins: every admin account and invite. */
export async function GET() {
  const auth = await authorizeApi("admins:view");
  if (auth.error) return auth.error;

  return Response.json(await getAdmins());
}

/**
 * POST /api/admins
 * Body: { name, email, role }. Sends an invite.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeApi("admins:manage");
  if (auth.error) return auth.error;

  const body = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: body.error.issues[0].message, issues: body.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await inviteAdmin(body.data, auth.user);
    if (!result.ok) {
      const error = result.error as keyof typeof inviteErrorMessages;
      return Response.json(
        { error: inviteErrorMessages[error] },
        { status: 409 },
      );
    }
    return Response.json(result.admins, { status: 201 });
  } catch (error) {
    if (error instanceof SandboxFullError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
