import { z } from "zod";
import type {
  Business,
  Transaction,
  Wallet,
  WalletStatus,
} from "@/lib/data/types";
import { kobo } from "@/lib/money";
import { createRandom } from "@/lib/data/random";

/**
 * Wallets: one per business, holding the money PayDesk has settled to it.
 * Everything here is pure (no cookies, no server APIs), so it's tested
 * directly and safe to share with the client for optimistic updates.
 */

/** Wallets frozen in the seed data, so the page has realistic examples. */
const seededFreezes: Record<string, string> = {
  biz_010: "Unusual chargeback pattern under review",
  biz_015: "Identity documents expired",
};

/**
 * Builds wallets from the transactions: each successful collection adds the
 * amount minus PayDesk's fee; each successful payout or refund removes the
 * amount plus the fee. A seeded opening balance (from before the data
 * starts) keeps every balance positive.
 */
export function generateWallets(
  businesses: readonly Business[],
  transactions: readonly Transaction[],
): Wallet[] {
  const net = new Map<string, number>();
  for (const txn of transactions) {
    if (txn.status !== "successful") continue;
    const change =
      txn.type === "collection"
        ? txn.amount - txn.fee
        : -(txn.amount + txn.fee);
    net.set(txn.businessId, (net.get(txn.businessId) ?? 0) + change);
  }

  const random = createRandom(20_261_022);
  return businesses.map((business, i) => {
    const settled = net.get(business.id) ?? 0;
    // ₦250k–₦5M carried over, plus whatever covers any shortfall
    const opening =
      random.int(250_000, 5_000_000) * 100 + Math.max(0, -settled);
    const reason = seededFreezes[business.id];
    return {
      id: `wal_${String(i + 1).padStart(3, "0")}`,
      businessId: business.id,
      businessName: business.name,
      balance: kobo(opening + settled),
      status: reason ? "frozen" : "active",
      ...(reason && {
        frozen: {
          reason,
          at: "2026-10-18T09:30:00.000Z",
          by: "Risk team",
        },
      }),
    };
  });
}

export const freezeReasons = [
  "Suspected fraud",
  "Unusual chargeback pattern under review",
  "Identity documents expired",
  "Court or regulator order",
  "Requested by the business",
] as const;

/** What the client sends to freeze or unfreeze a wallet. */
/**
 * The freeze form's fields. Shared by the form (instant feedback in the
 * browser) and the API (the real check), so they can't disagree.
 */
export const freezeFormSchema = z.object({
  reason: z.enum(freezeReasons, { error: "Choose a reason" }),
  note: z
    .string()
    .trim()
    .max(200, "Keep the note under 200 characters")
    .optional(),
});
export type FreezeForm = z.infer<typeof freezeFormSchema>;

export const walletStatusChangeSchema = z.discriminatedUnion("action", [
  freezeFormSchema.extend({ action: z.literal("freeze") }),
  z.object({ action: z.literal("unfreeze") }),
]);
export type WalletStatusChange = z.infer<typeof walletStatusChangeSchema>;

export type StatusChangeResult =
  | { ok: true; wallet: Wallet }
  | { ok: false; error: "already_frozen" | "not_frozen" };

/** Applies a freeze or unfreeze, refusing changes that make no sense. */
export function changeWalletStatus(
  wallet: Wallet,
  change: WalletStatusChange,
  actor: string,
  now: string,
): StatusChangeResult {
  if (change.action === "freeze") {
    if (wallet.status === "frozen")
      return { ok: false, error: "already_frozen" };
    const reason = change.note
      ? `${change.reason}: ${change.note}`
      : change.reason;
    return {
      ok: true,
      wallet: {
        ...wallet,
        status: "frozen",
        frozen: { reason, at: now, by: actor },
      },
    };
  }
  if (wallet.status !== "frozen") return { ok: false, error: "not_frozen" };
  const rest = withoutFreeze(wallet);
  return { ok: true, wallet: { ...rest, status: "active" } };
}

/** A copy of the wallet without its freeze details. */
function withoutFreeze(wallet: Wallet): Omit<Wallet, "frozen"> {
  const copy = { ...wallet };
  delete copy.frozen;
  return copy;
}

/** A visitor's own changes on top of the shared demo data. */
export interface WalletOverride {
  status: WalletStatus;
  frozen?: Wallet["frozen"];
}

export function applyWalletOverrides(
  wallets: readonly Wallet[],
  overrides: Record<string, WalletOverride>,
): Wallet[] {
  return wallets.map((wallet) => {
    const override = overrides[wallet.id];
    if (!override) return wallet;
    const rest = withoutFreeze(wallet);
    return override.status === "frozen"
      ? { ...rest, status: "frozen", frozen: override.frozen }
      : { ...rest, status: "active" };
  });
}

/** Optimistic update for the client: the list as it will look after the change. */
export function withWalletStatus(
  wallets: readonly Wallet[],
  id: string,
  status: WalletStatus,
): Wallet[] {
  return wallets.map((wallet) => {
    if (wallet.id !== id) return wallet;
    const rest = withoutFreeze(wallet);
    return status === "frozen"
      ? {
          ...rest,
          status,
          frozen: wallet.frozen ?? { reason: "Freezing…", at: "", by: "" },
        }
      : { ...rest, status };
  });
}
