import type { NextRequest } from "next/server";
import { authorizeApi } from "@/lib/auth/api";
import { feeEstimateRequestSchema } from "@/lib/fees/fees";
import { estimateFee } from "@/lib/fees/service";

/**
 * POST /api/fees/estimate
 * Body: { channel, businessId?, rule }. Changes nothing: it only compares
 * what a proposed rule would have earned with the rule in place now.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeApi("fees:manage");
  if (auth.error) return auth.error;

  const body = feeEstimateRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return Response.json(
      { error: "Invalid request", issues: body.error.issues },
      { status: 400 },
    );
  }

  const { channel, businessId, rule } = body.data;
  return Response.json(await estimateFee(channel, businessId, rule));
}
