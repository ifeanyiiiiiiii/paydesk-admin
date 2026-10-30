import { authorizeApi } from "@/lib/auth/api";
import { getFees } from "@/lib/fees/service";

/** GET /api/fees: default rules and custom rates. */
export async function GET() {
  const auth = await authorizeApi("fees:view");
  if (auth.error) return auth.error;

  return Response.json(await getFees());
}
