import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/auth/api";
import { lookupAccount } from "@/lib/wallets/bank-lookup";
import { accountNumberSchema, bankCodes } from "@/lib/wallets/withdrawals";

const querySchema = z.object({
  bank: z.enum(bankCodes),
  account: accountNumberSchema,
});

/** GET /api/banks/lookup?bank=101&account=0123456789: the account holder's name. */
export async function GET(request: NextRequest) {
  const auth = await authorizeApi("wallets:withdraw");
  if (auth.error) return auth.error;

  const query = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!query.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const accountName = lookupAccount(query.data.account);
  if (!accountName) {
    return Response.json(
      { error: "We couldn't find this account at that bank" },
      { status: 404 },
    );
  }
  return Response.json({ accountName });
}
