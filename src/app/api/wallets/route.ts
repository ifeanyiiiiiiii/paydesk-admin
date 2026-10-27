import { authorizeApi } from "@/lib/auth/api";
import { getWallets } from "@/lib/wallets/service";

/** GET /api/wallets: every wallet, with this visitor's changes applied. */
export async function GET() {
  const auth = await authorizeApi("wallets:view");
  if (auth.error) return auth.error;

  return Response.json(await getWallets(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
