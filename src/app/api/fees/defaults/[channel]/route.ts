import type { NextRequest } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { feeChannelSchema, feeRuleSchema } from "@/lib/fees/fees";
import { setDefaultFee } from "@/lib/fees/service";
import { SandboxFullError } from "@/lib/sandbox/fit";

/**
 * PUT /api/fees/defaults/:channel
 * Body: { percentBps, flat (kobo), cap? (kobo) }
 */
export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/fees/defaults/[channel]">,
) {
  const auth = await authorizeApi("fees:manage");
  if (auth.error) return auth.error;

  const channel = feeChannelSchema.safeParse((await ctx.params).channel);
  if (!channel.success) {
    return Response.json({ error: "Unknown fee channel" }, { status: 404 });
  }

  const rule = feeRuleSchema.safeParse(await request.json().catch(() => null));
  if (!rule.success) {
    return Response.json(
      { error: rule.error.issues[0].message, issues: rule.error.issues },
      { status: 400 },
    );
  }

  try {
    return Response.json(
      await setDefaultFee(channel.data, rule.data, auth.user.name),
    );
  } catch (error) {
    if (error instanceof SandboxFullError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
