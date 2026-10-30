import type { NextRequest } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import {
  feeChannelSchema,
  feeRuleSchema,
  MAX_CUSTOM_FEES,
} from "@/lib/fees/fees";
import {
  type CustomFeeResult,
  removeCustomFee,
  setCustomFee,
} from "@/lib/fees/service";
import { SandboxFullError } from "@/lib/sandbox/fit";

const messages = {
  business_not_found: { status: 404, error: "Business not found" },
  not_found: { status: 404, error: "This business has no custom rate here" },
  too_many: {
    status: 409,
    error: `The demo keeps up to ${MAX_CUSTOM_FEES} custom rates. Remove one first.`,
  },
} as const;

function toResponse(result: CustomFeeResult) {
  if (result.ok) return Response.json(result.fees);
  const { status, error } = messages[result.error];
  return Response.json({ error }, { status });
}

/** Turns a full demo cookie into a clear refusal. */
async function respond(action: () => Promise<CustomFeeResult>) {
  try {
    return toResponse(await action());
  } catch (error) {
    if (error instanceof SandboxFullError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

/**
 * PUT /api/fees/custom/:businessId/:channel
 * Body: { percentBps, flat (kobo), cap? (kobo) }. Replaces any existing rate.
 */
export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/fees/custom/[businessId]/[channel]">,
) {
  const auth = await authorizeApi("fees:manage");
  if (auth.error) return auth.error;

  const { businessId, channel: rawChannel } = await ctx.params;
  const channel = feeChannelSchema.safeParse(rawChannel);
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

  return respond(() =>
    setCustomFee(businessId, channel.data, rule.data, auth.user.name),
  );
}

/** DELETE /api/fees/custom/:businessId/:channel: back to the default rate. */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/fees/custom/[businessId]/[channel]">,
) {
  const auth = await authorizeApi("fees:manage");
  if (auth.error) return auth.error;

  const { businessId, channel: rawChannel } = await ctx.params;
  const channel = feeChannelSchema.safeParse(rawChannel);
  if (!channel.success) {
    return Response.json({ error: "Unknown fee channel" }, { status: 404 });
  }

  return respond(() => removeCustomFee(businessId, channel.data));
}
