import type { NextRequest } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { SandboxFullError } from "@/lib/sandbox/fit";
import { setWalletStatus } from "@/lib/wallets/service";
import {
  walletForRole,
  walletStatusChangeSchema,
} from "@/lib/wallets/wallets";

const messages = {
  not_found: { status: 404, error: "Wallet not found" },
  already_frozen: { status: 409, error: "This wallet is already frozen" },
  not_frozen: { status: 409, error: "This wallet isn't frozen" },
} as const;

/**
 * POST /api/wallets/:id/status
 * Body: { "action": "freeze", "reason": "...", "note"?: "..." } or { "action": "unfreeze" }
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/wallets/[id]/status">,
) {
  const auth = await authorizeApi("wallets:freeze");
  if (auth.error) return auth.error;

  const body = walletStatusChangeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return Response.json(
      { error: "Invalid request", issues: body.error.issues },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  try {
    const result = await setWalletStatus(id, body.data, auth.user.name);
    if (!result.ok) {
      const { status, error } = messages[result.error];
      return Response.json({ error }, { status });
    }
    return Response.json(walletForRole(result.wallet, auth.user.role));
  } catch (error) {
    if (error instanceof SandboxFullError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
