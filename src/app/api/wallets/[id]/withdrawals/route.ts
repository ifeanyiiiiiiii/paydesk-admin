import type { NextRequest } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { SandboxFullError } from "@/lib/sandbox/fit";
import { createWithdrawal } from "@/lib/wallets/service";
import {
  withdrawalMessages,
  withdrawalRequestSchema,
} from "@/lib/wallets/withdrawals";

const statusFor = {
  not_found: 404,
  account_not_found: 404,
  wallet_frozen: 409,
  below_minimum: 422,
  above_maximum: 422,
  insufficient_funds: 422,
} as const;

const messages = {
  ...withdrawalMessages,
  not_found: "Wallet not found",
  account_not_found: "We couldn't find this account at that bank",
};

/**
 * POST /api/wallets/:id/withdrawals
 * Body: { amount (kobo), bankCode, accountNumber, idempotencyKey }
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/wallets/[id]/withdrawals">,
) {
  const auth = await authorizeApi("wallets:withdraw");
  if (auth.error) return auth.error;

  const body = withdrawalRequestSchema.safeParse(
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
    const result = await createWithdrawal(id, body.data, auth.user.name);
    if (!result.ok) {
      return Response.json(
        { error: messages[result.error] },
        { status: statusFor[result.error] },
      );
    }
    return Response.json(
      { wallet: result.wallet, withdrawal: result.withdrawal },
      { status: result.replayed ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof SandboxFullError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
